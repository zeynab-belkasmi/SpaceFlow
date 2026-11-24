import { DomainException } from '../../../src/domain/exceptions/DomainException';
import { SlotConflictException } from '../../../src/domain/exceptions/SlotConflictException';
import { ResourceUnderMaintenanceException } from '../../../src/domain/exceptions/ResourceUnderMaintenanceException';
import { NotFoundException } from '../../../src/domain/exceptions/NotFoundException';
import { ForbiddenException } from '../../../src/domain/exceptions/ForbiddenException';
import { QuotaExceededException } from '../../../src/domain/exceptions/QuotaExceededException';
import { BookingWindowExceededException } from '../../../src/domain/exceptions/BookingWindowExceededException';

describe('domain exceptions', () => {
  it.each([
    [SlotConflictException, 'SLOT_CONFLICT'],
    [ResourceUnderMaintenanceException, 'RESOURCE_UNDER_MAINTENANCE'],
    [NotFoundException, 'NOT_FOUND'],
    [ForbiddenException, 'FORBIDDEN'],
    [QuotaExceededException, 'QUOTA_EXCEEDED'],
    [BookingWindowExceededException, 'BOOKING_WINDOW_EXCEEDED'],
  ])('%p has the code %s', (Exception, code) => {
    const error = new Exception('Something went wrong.');

    expect(error).toBeInstanceOf(DomainException);
    expect(error.code).toBe(code);
    expect(error.message).toBe('Something went wrong.');
    expect(error.name).toBe(Exception.name);
  });
});
