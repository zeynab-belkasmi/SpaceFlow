import { BookingEventType } from '../observers/BookingEvent';

export interface AuditLogProps {
  id: string;
  action: BookingEventType;
  bookingId: string;
  resourceId: string;
  actorId: string;
  occurredAt: Date;
}

/** Entity: one line of the audit log. Written once, never modified. */
export class AuditLog {
  private constructor(private readonly props: AuditLogProps) {}

  static create(props: AuditLogProps): AuditLog {
    return new AuditLog({ ...props, occurredAt: new Date(props.occurredAt.getTime()) });
  }

  get id(): string {
    return this.props.id;
  }

  get action(): BookingEventType {
    return this.props.action;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get resourceId(): string {
    return this.props.resourceId;
  }

  get actorId(): string {
    return this.props.actorId;
  }

  get occurredAt(): Date {
    return new Date(this.props.occurredAt.getTime());
  }
}
