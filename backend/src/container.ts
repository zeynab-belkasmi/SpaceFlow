import { AuditLogService } from './application/AuditLogService';
import { BookingService } from './application/BookingService';
import { ResourceService } from './application/ResourceService';
import { UserService } from './application/UserService';
import { AuditLogObserver } from './domain/observers/AuditLogObserver';
import { BookingEventPublisher } from './domain/observers/BookingEventPublisher';
import { IClock } from './domain/ports/IClock';
import { IIdGenerator } from './domain/ports/IIdGenerator';
import { BookingPolicyFactory } from './domain/strategies/BookingPolicyFactory';
import { SystemClock } from './infrastructure/ports/SystemClock';
import { UuidGenerator } from './infrastructure/ports/UuidGenerator';
import { InMemoryAuditLogRepository } from './infrastructure/repositories/InMemoryAuditLogRepository';
import { InMemoryBookingRepository } from './infrastructure/repositories/InMemoryBookingRepository';
import { InMemoryResourceRepository } from './infrastructure/repositories/InMemoryResourceRepository';
import { InMemoryUserRepository } from './infrastructure/repositories/InMemoryUserRepository';
import { seedResources, seedUsers } from './infrastructure/seed';

export interface ContainerOptions {
  /** Defaults to the system clock; tests pass a fixed one. */
  clock?: IClock;
  /** Defaults to random UUIDs. */
  ids?: IIdGenerator;
}

export interface Container {
  services: {
    bookings: BookingService;
    resources: ResourceService;
    auditLogs: AuditLogService;
    users: UserService;
  };
}

/**
 * Composition root: the ONLY place that knows every concrete class and wires them.
 *
 * Moving to Prisma later means changing the four repository lines below and nothing
 * else: services and domain only know the interfaces.
 */
export function createContainer(options: ContainerOptions = {}): Container {
  const clock = options.clock ?? new SystemClock();
  const ids = options.ids ?? new UuidGenerator();

  const bookingRepository = new InMemoryBookingRepository();
  const resourceRepository = new InMemoryResourceRepository(seedResources());
  const userRepository = new InMemoryUserRepository(seedUsers());
  const auditLogRepository = new InMemoryAuditLogRepository();

  // Observer wiring: every booking event ends up in the audit log.
  const publisher = new BookingEventPublisher();
  publisher.subscribe(new AuditLogObserver(auditLogRepository, ids));

  return {
    services: {
      bookings: new BookingService({
        bookings: bookingRepository,
        resources: resourceRepository,
        policies: new BookingPolicyFactory(),
        publisher,
        clock,
        ids,
      }),
      resources: new ResourceService({
        resources: resourceRepository,
        bookings: bookingRepository,
        ids,
      }),
      auditLogs: new AuditLogService({ auditLogs: auditLogRepository }),
      users: new UserService({ users: userRepository }),
    },
  };
}
