// @ts-nocheck
// bookingRepository: 경험(Experience), 슬롯(Slot), 예약(Booking), 리뷰(Review) 관련 데이터베이스 작업을 담당하는 리포지토리입니다.
import { db } from '../db';
import {
  experiences,
  slots,
  bookings,
  reviews,
  users,
  type Experience,
  type InsertExperience,
  type Slot,
  type InsertSlot,
  type Booking,
  type InsertBooking,
  type Review,
  type InsertReview,
} from '@shared/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { createNotification } from './notificationRepository';

// --- Experience operations ---

export async function createExperience(experience: InsertExperience): Promise<Experience> {
  const [newExperience] = await db
    .insert(experiences)
    .values(experience)
    .returning();
  return newExperience!;
}

export async function getExperiences(
  location?: string,
  category?: string
): Promise<Experience[]> {
  let conditions = [eq(experiences.isActive, true)];

  if (location) {
    conditions.push(like(experiences.location, `%${location}%`));
  }

  if (category) {
    conditions.push(eq(experiences.category, category));
  }

  return await db
    .select()
    .from(experiences)
    .where(and(...conditions))
    .orderBy(desc(experiences.createdAt));
}

export async function getExperienceById(id: number): Promise<Experience | undefined> {
  const [experience] = await db
    .select()
    .from(experiences)
    .where(and(eq(experiences.id, id), eq(experiences.isActive, true)));
  return experience;
}

export async function getExperiencesByHost(hostId: string): Promise<Experience[]> {
  return await db
    .select({
      id: experiences.id,
      hostId: experiences.hostId,
      title: experiences.title,
      description: experiences.description,
      price: experiences.price,
      currency: experiences.currency,
      location: experiences.location,
      latitude: experiences.latitude,
      longitude: experiences.longitude,
      category: experiences.category,
      duration: experiences.duration,
      maxParticipants: experiences.maxParticipants,
      images: experiences.images,
      included: experiences.included,
      requirements: experiences.requirements,
      rating: experiences.rating,
      reviewCount: experiences.reviewCount,
      isActive: experiences.isActive,
      createdAt: experiences.createdAt,
      updatedAt: experiences.updatedAt,
    })
    .from(experiences)
    .where(eq(experiences.hostId, hostId))
    .orderBy(desc(experiences.createdAt));
}

export async function updateExperience(
  id: number,
  updates: Partial<InsertExperience>
): Promise<Experience | undefined> {
  const [experience] = await db
    .update(experiences)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(experiences.id, id))
    .returning();
  return experience;
}

export async function deleteExperience(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(experiences)
      .where(eq(experiences.id, id))
      .returning();
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting experience:', error);
    return false;
  }
}

// --- Slot operations ---

export async function createSlot(slot: InsertSlot): Promise<Slot> {
  const [created] = await db.insert(slots).values(slot).returning();
  return created!;
}

export async function getSlotsByHost(hostId: string): Promise<Slot[]> {
  return await db
    .select()
    .from(slots)
    .where(eq(slots.hostId, hostId))
    .orderBy(desc(slots.date));
}

export async function getSlotById(id: number): Promise<Slot | undefined> {
  const [slot] = await db
    .select()
    .from(slots)
    .where(eq(slots.id, id));
  return slot;
}

export async function updateSlot(id: number, updates: Partial<InsertSlot>): Promise<Slot | undefined> {
  const [updated] = await db
    .update(slots)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(eq(slots.id, id))
    .returning();
  return updated;
}

export async function deleteSlot(id: number): Promise<boolean> {
  const result = await db
    .delete(slots)
    .where(eq(slots.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function searchSlots(filters: {
  hostId?: string;
  startDate?: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  category?: string;
  serviceType?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  minParticipants?: number;
  limit?: number;
  offset?: number;
}): Promise<Slot[]> {
  let query = db.select().from(slots);
  const conditions = [];

  if (filters.hostId) {
    conditions.push(eq(slots.hostId, filters.hostId));
  }
  
  if (filters.startDate) {
    conditions.push(sql`${slots.date} >= ${filters.startDate}`);
  }
  
  if (filters.endDate) {
    conditions.push(sql`${slots.date} <= ${filters.endDate}`);
  }
  
  if (filters.category) {
    conditions.push(eq(slots.category, filters.category));
  }
  
  if (filters.serviceType) {
    conditions.push(eq(slots.serviceType, filters.serviceType));
  }
  
  if (filters.minPrice !== undefined) {
    conditions.push(sql`${slots.priceAmount}::decimal >= ${filters.minPrice}`);
  }
  
  if (filters.maxPrice !== undefined) {
    conditions.push(sql`${slots.priceAmount}::decimal <= ${filters.maxPrice}`);
  }
  
  if (filters.availableOnly) {
    conditions.push(eq(slots.isAvailable, true));
  }
  
  if (filters.minParticipants !== undefined) {
    conditions.push(sql`${slots.maxParticipants} >= ${filters.minParticipants}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(slots.date));
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.offset(filters.offset);
  }

  return await query;
}

export async function updateSlotAvailability(id: number, isAvailable: boolean, reason?: string): Promise<Slot | undefined> {
  const updates: Partial<InsertSlot> = {
    isAvailable,
    updatedAt: new Date()
  };
  
  if (reason && !isAvailable) {
    updates.unavailableReason = reason;
  }
  
  const [updated] = await db
    .update(slots)
    .set(updates)
    .where(eq(slots.id, id))
    .returning();
  return updated;
}

export async function bulkCreateSlots(template: Omit<InsertSlot, 'date'>, dates: string[]): Promise<Slot[]> {
  const slotData = dates.map(date => ({
    ...template,
    date
  }));
  
  const created = await db.insert(slots).values(slotData).returning();
  return created;
}

export async function getAvailableSlots(hostId: string, startDate: string, endDate: string): Promise<Slot[]> {
  return await db
    .select()
    .from(slots)
    .where(
      and(
        eq(slots.hostId, hostId),
        eq(slots.isAvailable, true),
        sql`${slots.date} >= ${startDate}`,
        sql`${slots.date} <= ${endDate}`
      )
    )
    .orderBy(slots.date);
}

// --- Booking operations ---

export async function createBooking(booking: InsertBooking): Promise<Booking> {
  if (booking.slotId) {
    const slot = await getSlotById(booking.slotId);
    if (!slot) {
      throw new Error('슬롯을 찾을 수 없습니다');
    }
    
    const availability = await checkSlotAvailability(booking.slotId, booking.participants);
    if (!availability.available) {
      throw new Error('선택한 슬롯에 충분한 자리가 없습니다');
    }
    
    const bookingData = {
      ...booking,
      experienceId: slot.experienceId,
      hostId: slot.hostId,
      date: slot.date,
      totalPrice: (parseFloat(slot.priceAmount) * booking.participants).toString()
    };
    
    const [created] = await db.insert(bookings).values(bookingData).returning();
    
    await db
      .update(slots)
      .set({ 
        currentBookings: sql`${slots.currentBookings} + ${booking.participants}`,
        updatedAt: sql`now()`
      })
      .where(eq(slots.id, booking.slotId));
    
    return created!;
  }
  
  const existingColumns = {
    experienceId: booking.experienceId,
    guestId: booking.guestId,
    hostId: booking.hostId,
    date: booking.date,
    participants: booking.participants,
    totalPrice: booking.totalPrice,
    status: booking.status || 'pending',
    specialRequests: booking.specialRequests,
  };
  
  const [created] = await db.insert(bookings).values(existingColumns).returning();
  return created!;
}

export async function getBookingById(id: number): Promise<Booking | undefined> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id));
  return booking;
}

export async function getBookingsByUser(userId: string, role: 'guest' | 'host'): Promise<Booking[]> {
  const column = role === 'guest' ? bookings.guestId : bookings.hostId;
  return await db
    .select()
    .from(bookings)
    .where(eq(column, userId))
    .orderBy(desc(bookings.date));
}

export async function getBookingsByGuest(guestId: string): Promise<Booking[]> {
  return await getBookingsByUser(guestId, 'guest');
}

export async function getBookingsByHost(hostId: string): Promise<Booking[]> {
  return await getBookingsByUser(hostId, 'host');
}

export async function getBookingsBySlot(slotId: number): Promise<Booking[]> {
  return await db
    .select()
    .from(bookings)
    .where(eq(bookings.slotId, slotId))
    .orderBy(desc(bookings.createdAt));
}

export async function updateBookingStatus(id: number, status: string, cancelReason?: string): Promise<Booking | undefined> {
  const existingBooking = await getBookingById(id);
  if (!existingBooking) {
    throw new Error('Booking not found');
  }

  const updates: Partial<InsertBooking> = {
    status,
    updatedAt: new Date()
  };
  
  if (status === 'confirmed') {
    updates.confirmedAt = new Date();
  } else if (status === 'declined') {
    updates.declinedAt = new Date();
  } else if (status === 'cancelled') {
    updates.cancelledAt = new Date();
    if (cancelReason) {
      updates.cancelReason = cancelReason;
    }
  } else if (status === 'completed') {
    updates.completedAt = new Date();
  }
  
  const [updated] = await db
    .update(bookings)
    .set(updates)
    .where(eq(bookings.id, id))
    .returning();
    
  if (updated && updated.slotId) {
    const previousStatus = existingBooking.status;
    
    if (status === 'confirmed' && previousStatus === 'pending') {
      await db
        .update(slots)
        .set({ 
          currentBookings: sql`${slots.currentBookings} + ${updated.participants}`,
          updatedAt: sql`now()`
        })
        .where(eq(slots.id, updated.slotId));
    }
    
    else if ((status === 'cancelled' || status === 'declined') && previousStatus === 'confirmed') {
      await db
        .update(slots)
        .set({ 
          currentBookings: sql`${slots.currentBookings} - ${updated.participants}`,
          updatedAt: sql`now()`
        })
        .where(eq(slots.id, updated.slotId));
    }
  }
  
  return updated;
}

export async function searchBookings(filters: {
  userId?: string;
  role?: 'guest' | 'host';
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<Booking[]> {
  let query = db.select().from(bookings);
  const conditions = [];
  
  if (filters.userId && filters.role) {
    const column = filters.role === 'guest' ? bookings.guestId : bookings.hostId;
    conditions.push(eq(column, filters.userId));
  }
  
  if (filters.status) {
    conditions.push(eq(bookings.status, filters.status));
  }
  
  if (filters.startDate) {
    conditions.push(sql`${bookings.date} >= ${filters.startDate}`);
  }
  
  if (filters.endDate) {
    conditions.push(sql`${bookings.date} <= ${filters.endDate}`);
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  query = query.orderBy(desc(bookings.date));
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.offset(filters.offset);
  }
  
  return await query;
}

export async function checkSlotAvailability(slotId: number, participants: number): Promise<{
  available: boolean;
  remainingCapacity: number;
  conflicts?: string[];
}> {
  const slot = await getSlotById(slotId);
  if (!slot) {
    return {
      available: false,
      remainingCapacity: 0,
      conflicts: ['슬롯을 찾을 수 없습니다']
    };
  }
  
  if (!slot.isAvailable) {
    return {
      available: false,
      remainingCapacity: 0,
      conflicts: ['슬롯이 비활성화되었습니다']
    };
  }
  
  const currentBookings = slot.currentBookings || 0;
  const remainingCapacity = slot.maxParticipants - currentBookings;
  
  if (remainingCapacity < participants) {
    return {
      available: false,
      remainingCapacity,
      conflicts: [`요청한 참가자 수(${participants}명)가 남은 자리(${remainingCapacity}명)를 초과합니다`]
    };
  }
  
  return {
    available: true,
    remainingCapacity
  };
}

// --- 자동화 비즈니스 로직 ---

export async function processExpiredBookings(): Promise<number> {
  const now = new Date();
  
  const expiredBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'pending'),
        eq(bookings.paymentStatus, 'pending'),
        sql`${bookings.expiresAt} < ${now}`
      )
    );

  let processedCount = 0;
  
  for (const booking of expiredBookings) {
    try {
      await updateBookingStatus(booking.id, 'cancelled', '결제 시간 만료로 인한 자동 취소');
      
      await db
        .update(bookings)
        .set({ 
          paymentStatus: 'failed',
          updatedAt: new Date()
        })
        .where(eq(bookings.id, booking.id));
        
      processedCount++;
    } catch (error) {
      console.error(`Failed to expire booking ${booking.id}:`, error);
    }
  }
  
  return processedCount;
}

export async function processCompletedExperiences(): Promise<number> {
  const now = new Date();
  
  const completableBookings = await db
    .select({
      booking: bookings,
      slot: slots
    })
    .from(bookings)
    .innerJoin(slots, eq(bookings.slotId, slots.id))
    .where(
      and(
        eq(bookings.status, 'confirmed'),
        sql`CONCAT(${slots.date}, ' ', ${slots.endTime})::timestamp < ${now}`
      )
    );

  let processedCount = 0;
  
  for (const { booking } of completableBookings) {
    try {
      await updateBookingStatus(booking.id, 'completed');
      processedCount++;
    } catch (error) {
      console.error(`Failed to complete booking ${booking.id}:`, error);
    }
  }
  
  return processedCount;
}

export async function recalculateSlotAvailability(slotId?: number): Promise<void> {
  const condition = slotId ? eq(slots.id, slotId) : undefined;
  
  const slotsToUpdate = await db
    .select()
    .from(slots)
    .where(condition);

  for (const slot of slotsToUpdate) {
    const [result] = await db
      .select({
        totalBookings: sql`COALESCE(SUM(${bookings.participants}), 0)`
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.slotId, slot.id),
          eq(bookings.status, 'confirmed')
        )
      );

    const actualBookings = parseInt(result.totalBookings as string) || 0;
    
    if (actualBookings !== slot.currentBookings) {
      await db
        .update(slots)
        .set({ 
          currentBookings: actualBookings,
          updatedAt: new Date()
        })
        .where(eq(slots.id, slot.id));
        
      console.log(`Slot ${slot.id} booking count corrected: ${slot.currentBookings} → ${actualBookings}`);
    }
  }
}

// --- Review operations ---

export async function createReview(review: InsertReview): Promise<Review> {
  const [newReview] = await db.insert(reviews).values(review).returning();

  const avgRating = await db
    .select({
      avg: sql<number>`avg(${reviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(eq(reviews.experienceId, review.experienceId));

  if (avgRating[0]) {
    await db
      .update(experiences)
      .set({
        rating: Number(avgRating[0].avg.toFixed(2)),
        reviewCount: Number(avgRating[0].count),
      })
      .where(eq(experiences.id, review.experienceId));
  }

  return newReview!;
}

export async function getReviewsByExperience(experienceId: number): Promise<Review[]> {
  return await db
    .select()
    .from(reviews)
    .where(eq(reviews.experienceId, experienceId))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewsByHost(hostId: string): Promise<Review[]> {
  return await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      reviewerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      experienceTitle: experiences.title,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(experiences, eq(reviews.experienceId, experiences.id))
    .innerJoin(users, eq(reviews.guestId, users.id))
    .where(eq(experiences.hostId, hostId))
    .orderBy(desc(reviews.createdAt));
}
