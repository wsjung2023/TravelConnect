// @ts-nocheck
// Commerce Repository: Admin commerce, Purchase proxy, Traveler help request, and Service template/package operations.
import { db } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import {
  experiences,
  bookings,
  payments,
  reviews,
  users,
  purchaseRequests,
  purchaseQuotes,
  purchaseOrders,
  helpRequests,
  requestResponses,
  serviceTemplates,
  servicePackages,
  packageItems,
  type Experience,
  type Booking,
  type Payment,
  type PurchaseRequest,
  type InsertPurchaseRequest,
  type PurchaseQuote,
  type InsertPurchaseQuote,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type HelpRequest,
  type InsertHelpRequest,
  type RequestResponse,
  type InsertRequestResponse,
  type ServiceTemplate,
  type InsertServiceTemplate,
  type ServicePackage,
  type InsertServicePackage,
  type PackageItem,
  type InsertPackageItem,
} from '@shared/schema';

// Admin Commerce operations
export async function getCommerceStats(): Promise<{
  totalExperiences: number;
  totalBookings: number;
  totalRevenue: number;
  totalHosts: number;
  averageRating: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
}> {
  // 경험 총 개수
  const totalExperiencesResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(experiences);
  const totalExperiences = totalExperiencesResult[0]?.count || 0;

  // 예약 총 개수
  const totalBookingsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings);
  const totalBookings = totalBookingsResult[0]?.count || 0;

  // 예약 상태별 개수
  const bookingStatsResult = await db
    .select({
      status: bookings.status,
      count: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .groupBy(bookings.status);
  
  const pendingBookings = bookingStatsResult.find(s => s.status === 'pending')?.count || 0;
  const completedBookings = bookingStatsResult.find(s => s.status === 'completed')?.count || 0;
  const cancelledBookings = bookingStatsResult.find(s => s.status === 'cancelled')?.count || 0;

  // 총 매출 (성공한 결제 기준)
  const totalRevenueResult = await db
    .select({ sum: sql<number>`COALESCE(SUM(CAST(amount AS INTEGER)), 0)::int` })
    .from(payments)
    .where(eq(payments.status, 'captured'));
  const totalRevenue = totalRevenueResult[0]?.sum || 0;

  // 활성 호스트 수 (경험을 등록한 사용자)
  const totalHostsResult = await db
    .select({ count: sql<number>`count(distinct host_id)::int` })
    .from(experiences);
  const totalHosts = totalHostsResult[0]?.count || 0;

  // 평균 평점
  const averageRatingResult = await db
    .select({ avg: sql<number>`COALESCE(AVG(CAST(rating AS FLOAT)), 0)` })
    .from(reviews);
  const averageRating = averageRatingResult[0]?.avg || 0;

  // 결제 총 개수
  const totalPaymentsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments);
  const totalPayments = totalPaymentsResult[0]?.count || 0;

  // 결제 상태별 개수
  const paymentStatsResult = await db
    .select({
      status: payments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .groupBy(payments.status);
  
  const successfulPayments = paymentStatsResult.find(s => s.status === 'captured')?.count || 0;
  const failedPayments = paymentStatsResult.find(s => s.status === 'failed')?.count || 0;
  const pendingPayments = paymentStatsResult.find(s => s.status === 'pending')?.count || 0;

  return {
    totalExperiences,
    totalBookings,
    totalRevenue,
    totalHosts,
    averageRating,
    pendingBookings,
    completedBookings,
    cancelledBookings,
    totalPayments,
    successfulPayments,
    failedPayments,
    pendingPayments,
  };
}

export async function getExperiencesWithHosts(): Promise<(Experience & { host?: { firstName?: string; lastName?: string } })[]> {
  const experiencesWithHosts = await db
    .select({
      id: experiences.id,
      hostId: experiences.hostId,
      title: experiences.title,
      description: experiences.description,
      category: experiences.category,
      location: experiences.location,
      latitude: experiences.latitude,
      longitude: experiences.longitude,
      price: experiences.price,
      currency: experiences.currency,
      duration: experiences.duration,
      maxParticipants: experiences.maxParticipants,
      // availableDates: experiences.availableDates, // Note: This was in storage.ts but not in schema.ts snippet, might be a mismatch or truncated
      images: experiences.images,
      // amenities: experiences.amenities, // Note: Same as above
      rating: experiences.rating,
      reviewCount: experiences.reviewCount,
      isActive: experiences.isActive,
      createdAt: experiences.createdAt,
      updatedAt: experiences.updatedAt,
      host: {
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(experiences)
    .leftJoin(users, eq(experiences.hostId, users.id))
    .orderBy(desc(experiences.createdAt));

  return experiencesWithHosts as any; // Cast for now as some fields might be missing from schema snippet
}

export async function getBookingsWithDetails(): Promise<(Booking & { 
  experienceTitle: string; 
  guestName: string; 
  hostName: string; 
})[]> {
  const bookingsWithDetails = await db
    .select({
      id: bookings.id,
      experienceId: bookings.experienceId,
      guestId: bookings.guestId,
      hostId: bookings.hostId,
      date: bookings.date,
      participants: bookings.participants,
      totalPrice: bookings.totalPrice,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      // notes: bookings.notes, // Note: Schema snippet showed specialRequests instead of notes
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      experienceTitle: experiences.title,
      guestName: sql<string>`guest.first_name || ' ' || guest.last_name`,
      hostName: sql<string>`host.first_name || ' ' || host.last_name`,
    })
    .from(bookings)
    .leftJoin(experiences, eq(bookings.experienceId, experiences.id))
    .leftJoin(sql`users guest`, eq(bookings.guestId, sql`guest.id`))
    .leftJoin(sql`users host`, eq(bookings.hostId, sql`host.id`))
    .orderBy(desc(bookings.createdAt));

  return bookingsWithDetails as any;
}

export async function getAllPayments(): Promise<Payment[]> {
  const allPayments = await db
    .select()
    .from(payments)
    .orderBy(desc(payments.createdAt));

  return allPayments;
}

// Purchase Proxy operations (구매대행 서비스)
export async function createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest> {
  const [newRequest] = await db
    .insert(purchaseRequests)
    .values(request)
    .returning();
  return newRequest;
}

export async function getPurchaseRequestById(id: number): Promise<PurchaseRequest | undefined> {
  const [request] = await db
    .select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.id, id));
  return request;
}

export async function getPurchaseRequestsByBuyer(buyerId: string): Promise<PurchaseRequest[]> {
  const requests = await db
    .select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.buyerId, buyerId))
    .orderBy(desc(purchaseRequests.createdAt));
  return requests;
}

export async function getPurchaseRequestsBySeller(sellerId: string): Promise<PurchaseRequest[]> {
  const requests = await db
    .select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.sellerId, sellerId))
    .orderBy(desc(purchaseRequests.createdAt));
  return requests;
}

export async function updatePurchaseRequestStatus(id: number, status: string): Promise<PurchaseRequest | undefined> {
  const [updated] = await db
    .update(purchaseRequests)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(purchaseRequests.id, id))
    .returning();
  return updated;
}

export async function createPurchaseQuote(quote: InsertPurchaseQuote): Promise<PurchaseQuote> {
  const [newQuote] = await db
    .insert(purchaseQuotes)
    .values(quote)
    .returning();
  return newQuote;
}

export async function getPurchaseQuotesByRequest(requestId: number): Promise<PurchaseQuote[]> {
  const quotes = await db
    .select()
    .from(purchaseQuotes)
    .where(eq(purchaseQuotes.requestId, requestId))
    .orderBy(desc(purchaseQuotes.createdAt));
  return quotes;
}

export async function getPurchaseQuoteById(id: number): Promise<PurchaseQuote | undefined> {
  const [quote] = await db
    .select()
    .from(purchaseQuotes)
    .where(eq(purchaseQuotes.id, id));
  return quote;
}

export async function updatePurchaseQuoteStatus(id: number, status: string): Promise<PurchaseQuote | undefined> {
  const [updated] = await db
    .update(purchaseQuotes)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(purchaseQuotes.id, id))
    .returning();
  return updated;
}

export async function createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
  const [newOrder] = await db
    .insert(purchaseOrders)
    .values(order)
    .returning();
  return newOrder;
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrder | undefined> {
  const [order] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id));
  return order;
}

export async function getPurchaseOrdersByBuyer(buyerId: string): Promise<PurchaseOrder[]> {
  const orders = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.buyerId, buyerId))
    .orderBy(desc(purchaseOrders.createdAt));
  return orders;
}

export async function getPurchaseOrdersBySeller(sellerId: string): Promise<PurchaseOrder[]> {
  const orders = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.sellerId, sellerId))
    .orderBy(desc(purchaseOrders.createdAt));
  return orders;
}

export async function updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrder | undefined> {
  const [updated] = await db
    .update(purchaseOrders)
    .set({ orderStatus: status, updatedAt: sql`now()` })
    .where(eq(purchaseOrders.id, id))
    .returning();
  return updated;
}

export async function getShoppingServices(): Promise<Experience[]> {
  const services = await db
    .select()
    .from(experiences)
    .where(and(
      eq(experiences.category, 'shopping'),
      eq(experiences.isActive, true)
    ))
    .orderBy(desc(experiences.rating), desc(experiences.createdAt));
  return services;
}

// 여행자 도움 요청 시스템 구현
export async function createHelpRequest(request: InsertHelpRequest): Promise<HelpRequest> {
  const [newRequest] = await db
    .insert(helpRequests)
    .values(request)
    .returning();
  return newRequest;
}

export async function getHelpRequestById(id: number): Promise<HelpRequest | undefined> {
  const [request] = await db
    .select()
    .from(helpRequests)
    .where(eq(helpRequests.id, id));
  return request;
}

export async function getHelpRequestsByRequester(requesterId: string): Promise<HelpRequest[]> {
  const requests = await db
    .select()
    .from(helpRequests)
    .where(eq(helpRequests.requesterId, requesterId))
    .orderBy(desc(helpRequests.createdAt));
  return requests;
}

export async function updateHelpRequestStatus(id: number, status: string): Promise<HelpRequest | undefined> {
  const [updated] = await db
    .update(helpRequests)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(helpRequests.id, id))
    .returning();
  return updated;
}

export async function createHelpResponse(response: InsertRequestResponse): Promise<RequestResponse> {
  const [newResponse] = await db
    .insert(requestResponses)
    .values(response)
    .returning();
  
  // 응답 개수 업데이트
  await db
    .update(helpRequests)
    .set({ 
      responseCount: sql`${helpRequests.responseCount} + 1`,
      updatedAt: sql`now()` 
    })
    .where(eq(helpRequests.id, response.requestId));
  
  return newResponse;
}

export async function getHelpResponsesByRequest(requestId: number): Promise<RequestResponse[]> {
  const responses = await db
    .select()
    .from(requestResponses)
    .where(eq(requestResponses.requestId, requestId))
    .orderBy(desc(requestResponses.createdAt));
  return responses;
}

export async function updateHelpResponseStatus(id: number, status: string): Promise<RequestResponse | undefined> {
  const [updated] = await db
    .update(requestResponses)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(requestResponses.id, id))
    .returning();
  return updated;
}

// Service Template operations
export async function createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate> {
  const [created] = await db.insert(serviceTemplates).values(template).returning();
  return created;
}

export async function getServiceTemplatesByCreator(creatorId: string): Promise<ServiceTemplate[]> {
  return await db
    .select()
    .from(serviceTemplates)
    .where(eq(serviceTemplates.creatorId, creatorId))
    .orderBy(desc(serviceTemplates.createdAt));
}

export async function getServiceTemplateById(id: number): Promise<ServiceTemplate | undefined> {
  const [template] = await db
    .select()
    .from(serviceTemplates)
    .where(eq(serviceTemplates.id, id));
  return template;
}

export async function updateServiceTemplate(id: number, updates: Partial<InsertServiceTemplate>): Promise<ServiceTemplate | undefined> {
  const [updated] = await db
    .update(serviceTemplates)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(eq(serviceTemplates.id, id))
    .returning();
  return updated;
}

export async function deleteServiceTemplate(id: number): Promise<boolean> {
  const result = await db
    .delete(serviceTemplates)
    .where(eq(serviceTemplates.id, id));
  return result.rowCount > 0;
}

export async function getActiveServiceTemplates(templateType?: string): Promise<ServiceTemplate[]> {
  let query = db
    .select()
    .from(serviceTemplates)
    .where(eq(serviceTemplates.isActive, true));
  
  if (templateType) {
    query = query.where(eq(serviceTemplates.templateType, templateType));
  }
  
  return await query.orderBy(desc(serviceTemplates.createdAt));
}

// Service Package operations
export async function createServicePackage(packageData: InsertServicePackage): Promise<ServicePackage> {
  const [created] = await db.insert(servicePackages).values(packageData).returning();
  return created;
}

export async function getServicePackagesByCreator(creatorId: string): Promise<ServicePackage[]> {
  return await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.creatorId, creatorId))
    .orderBy(desc(servicePackages.createdAt));
}

export async function getServicePackageById(id: number): Promise<ServicePackage | undefined> {
  const [pkg] = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.id, id));
  return pkg;
}

export async function updateServicePackage(id: number, updates: Partial<InsertServicePackage>): Promise<ServicePackage | undefined> {
  const [updated] = await db
    .update(servicePackages)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(eq(servicePackages.id, id))
    .returning();
  return updated;
}

export async function deleteServicePackage(id: number): Promise<boolean> {
  const result = await db
    .delete(servicePackages)
    .where(eq(servicePackages.id, id));
  return result.rowCount > 0;
}

// Package Item operations
export async function createPackageItem(item: InsertPackageItem): Promise<PackageItem> {
  const [created] = await db.insert(packageItems).values(item).returning();
  return created;
}

export async function getPackageItemsByPackage(packageId: number): Promise<PackageItem[]> {
  return await db
    .select()
    .from(packageItems)
    .where(eq(packageItems.packageId, packageId))
    .orderBy(desc(packageItems.createdAt));
}

export async function deletePackageItem(id: number): Promise<boolean> {
  const result = await db
    .delete(packageItems)
    .where(eq(packageItems.id, id));
  return result.rowCount > 0;
}
