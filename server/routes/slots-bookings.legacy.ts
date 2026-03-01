// Legacy SlotsBookings routes extracted from server/routes.ts to reduce file size.
import type { Express } from 'express';

export function registerLegacySlotsBookingsRoutes(
  app: Express,
  deps: { storage: any; authenticateHybrid: any; validateSchema: any; CreateSlotSchema: any; SlotSearchSchema: any; UpdateSlotSchema: any; BulkCreateSlotsSchema: any; UpdateSlotAvailabilitySchema: any; CheckSlotAvailabilitySchema: any; CreateBookingSchema: any; BookingSearchSchema: any; UpdateBookingStatusSchema: any }
) {
  const { storage, authenticateHybrid, validateSchema, CreateSlotSchema, SlotSearchSchema, UpdateSlotSchema, BulkCreateSlotsSchema, UpdateSlotAvailabilitySchema, CheckSlotAvailabilitySchema, CreateBookingSchema, BookingSearchSchema, UpdateBookingStatusSchema } = deps;

  // ==================== 로컬 가이드 슬롯 관리 API ====================
  // 슬롯 생성
  app.post('/api/slots/create', authenticateHybrid, validateSchema(CreateSlotSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotData = {
        ...req.body,
        hostId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const slot = await storage.createSlot(slotData);
      console.log(`[SLOT] User ${req.user.email} created slot: ${slot.title} on ${slot.date}`);
      res.status(201).json(slot);
    } catch (error) {
      console.error('Error creating slot:', error);
      res.status(500).json({ message: 'Failed to create slot' });
    }
  });

  // 내 슬롯 목록 조회
  app.get('/api/slots/my', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slots = await storage.getSlotsByHost(req.user.id);
      res.json(slots);
    } catch (error) {
      console.error('Error fetching user slots:', error);
      res.status(500).json({ message: 'Failed to fetch slots' });
    }
  });

  // 슬롯 검색 (더 구체적인 라우트를 먼저 배치)
  app.get('/api/slots/search', validateSchema(SlotSearchSchema), async (req, res) => {
    try {
      const filters = req.query as any;
      const slots = await storage.searchSlots(filters);
      res.json(slots);
    } catch (error) {
      console.error('Error searching slots:', error);
      res.status(500).json({ message: 'Failed to search slots' });
    }
  });

  // 특정 슬롯 조회
  app.get('/api/slots/:id', async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      const slot = await storage.getSlotById(slotId);
      if (!slot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      res.json(slot);
    } catch (error) {
      console.error('Error fetching slot:', error);
      res.status(500).json({ message: 'Failed to fetch slot' });
    }
  });

  // 슬롯 업데이트
  app.put('/api/slots/:id', authenticateHybrid, validateSchema(UpdateSlotSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const existingSlot = await storage.getSlotById(slotId);
      if (!existingSlot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (existingSlot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const updated = await storage.updateSlot(slotId, req.body);
      if (updated) {
        console.log(`[SLOT] User ${req.user.email || req.user.id} updated slot: ${updated.title}`);
        res.json(updated);
      } else {
        res.status(500).json({ message: 'Failed to update slot' });
      }
    } catch (error) {
      console.error('Error updating slot:', error);
      res.status(500).json({ message: 'Failed to update slot' });
    }
  });

  // 슬롯 삭제
  app.delete('/api/slots/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const existingSlot = await storage.getSlotById(slotId);
      if (!existingSlot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (existingSlot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const deleted = await storage.deleteSlot(slotId);
      if (!deleted) {
        return res.status(404).json({ message: 'Failed to delete slot' });
      }
      
      console.log(`[SLOT] User ${req.user.email || req.user.id} deleted slot: ${existingSlot.title}`);
      res.json({ message: 'Slot deleted successfully' });
    } catch (error) {
      console.error('Error deleting slot:', error);
      res.status(500).json({ message: 'Failed to delete slot' });
    }
  });


  // 벌크 슬롯 생성
  app.post('/api/slots/bulk-create', authenticateHybrid, validateSchema(BulkCreateSlotsSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { template, dates } = req.body;
      const slotTemplate = {
        ...template,
        hostId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const slots = await storage.bulkCreateSlots(slotTemplate, dates);
      console.log(`[SLOT] User ${req.user.email} created ${slots.length} slots in bulk`);
      res.status(201).json(slots);
    } catch (error) {
      console.error('Error creating bulk slots:', error);
      res.status(500).json({ message: 'Failed to create bulk slots' });
    }
  });

  // 슬롯 가용성 업데이트
  app.patch('/api/slots/:id/availability', authenticateHybrid, validateSchema(UpdateSlotAvailabilitySchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const existingSlot = await storage.getSlotById(slotId);
      if (!existingSlot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (existingSlot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const { isAvailable, reason } = req.body;
      const updated = await storage.updateSlotAvailability(slotId, isAvailable, reason);
      
      if (updated) {
        console.log(`[SLOT] User ${req.user.email || req.user.id} updated slot availability: ${updated.title} -> ${isAvailable ? 'available' : 'unavailable'}`);
        res.json(updated);
      } else {
        res.status(500).json({ message: 'Failed to update slot availability' });
      }
    } catch (error) {
      console.error('Error updating slot availability:', error);
      res.status(500).json({ message: 'Failed to update slot availability' });
    }
  });

  // 가용한 슬롯 조회
  app.get('/api/slots/available/:hostId', async (req, res) => {
    try {
      const { hostId } = req.params;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const slots = await storage.getAvailableSlots(hostId, startDate, endDate);
      res.json(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      res.status(500).json({ message: 'Failed to fetch available slots' });
    }
  });

  // ==================== 예약 관리 API ====================
  
  // 새 예약 생성
  app.post('/api/bookings', authenticateHybrid, validateSchema(CreateBookingSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const guestId = req.user.id;
      const { experienceId, slotId } = req.body;
      
      // 중복 예약 체크
      const existingBooking = await storage.findExistingBooking(guestId, experienceId, slotId);
      if (existingBooking) {
        return res.status(400).json({ error: 'Already booked' });
      }

      const bookingData = {
        ...req.body,
        guestId
      };

      const booking = await storage.createBooking(bookingData);
      
      // 호스트에게 알림 생성 및 WebSocket 브로드캐스트
      try {
        const hostId = booking.hostId;
        if (hostId) {
          const notification = await storage.createNotification({
            userId: hostId,
            type: 'booking',
            title: '새 예약',
            message: '새 예약이 있습니다',
          });
          
          const sendNotificationToUser = (app as any).sendNotificationToUser;
          if (sendNotificationToUser) {
            sendNotificationToUser(hostId, notification);
          }
        }
      } catch (notifError) {
        console.error('Error sending booking notification:', notifError);
      }
      
      res.status(201).json(booking);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      if (error.message.includes('슬롯을 찾을 수 없습니다') || error.message.includes('충분한 자리가 없습니다')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  // 특정 예약 조회
  app.get('/api/bookings/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: 'Valid booking ID is required' });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // 접근 권한 확인 (예약자 또는 호스트만)
      if (booking.guestId !== req.user.id && booking.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({ message: 'Failed to fetch booking' });
    }
  });

  // 사용자 예약 목록 조회 (게스트 또는 호스트 역할별)
  app.get('/api/bookings', authenticateHybrid, validateSchema(BookingSearchSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const filters = {
        ...req.query,
        userId: req.user.id
      } as any;

      const bookings = await storage.searchBookings(filters);
      res.json(bookings);
    } catch (error) {
      console.error('Error searching bookings:', error);
      res.status(500).json({ message: 'Failed to search bookings' });
    }
  });

  // 예약 상태 업데이트 (호스트 전용)
  app.patch('/api/bookings/:id/status', authenticateHybrid, validateSchema(UpdateBookingStatusSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: 'Valid booking ID is required' });
      }

      // 예약 존재 및 권한 확인
      const existingBooking = await storage.getBookingById(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // 호스트만 상태 변경 가능 (게스트는 취소만 가능)
      const { status, cancelReason } = req.body;
      if (status === 'cancelled' && existingBooking.guestId === req.user.id) {
        // 게스트가 취소하는 경우
      } else if (existingBooking.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - only host can update booking status' });
      }

      const updatedBooking = await storage.updateBookingStatus(bookingId, status, cancelReason);
      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ message: 'Failed to update booking status' });
    }
  });

  // 슬롯 예약 가능성 확인
  app.get('/api/slots/:id/availability', validateSchema(CheckSlotAvailabilitySchema), async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      const { participants } = req.query as any;
      const participantCount = parseInt(participants) || 1;

      const availability = await storage.checkSlotAvailability(slotId, participantCount);
      res.json(availability);
    } catch (error) {
      console.error('Error checking slot availability:', error);
      res.status(500).json({ message: 'Failed to check slot availability' });
    }
  });

  // 특정 슬롯의 예약 목록 조회 (호스트 전용)
  app.get('/api/slots/:id/bookings', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const slot = await storage.getSlotById(slotId);
      if (!slot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (slot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const bookings = await storage.getBookingsBySlot(slotId);
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching slot bookings:', error);
      res.status(500).json({ message: 'Failed to fetch slot bookings' });
    }
  });
}
