// 쇼핑 대리구매 라우터 — 구매 대행 주문(PurchaseOrder) 생성·목록·상세·상태변경·취소 엔드포인트를 담당한다.
import type { Express } from 'express';

export function registerLegacyShoppingRoutes(
  app: Express,
  deps: { storage: any; authenticateHybrid: any }
) {
  const { storage, authenticateHybrid } = deps;

  // ========== 구매대행 서비스 API ==========

  // 구매대행 서비스 목록 조회 (shopping 카테고리 경험들)
  app.get('/api/shopping-services', async (req, res) => {
    try {
      const services = await storage.getShoppingServices();
      res.json(services);
    } catch (error) {
      console.error('Error fetching shopping services:', error);
      res.status(500).json({ message: 'Failed to fetch shopping services' });
    }
  });

  // 구매 요청 생성
  app.post('/api/purchase-requests', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestData = insertPurchaseRequestSchema.parse({
        ...req.body,
        buyerId: req.user.id,
      });

      const request = await storage.createPurchaseRequest(requestData);
      
      console.log(`[PURCHASE-REQUEST] User ${req.user.email} created purchase request for service ${requestData.serviceId}`);
      res.json(request);
    } catch (error) {
      console.error('Error creating purchase request:', error);
      res.status(500).json({ message: 'Failed to create purchase request' });
    }
  });

  // 구매 요청 조회 (구매자)
  app.get('/api/purchase-requests/buyer', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requests = await storage.getPurchaseRequestsByBuyer(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching buyer purchase requests:', error);
      res.status(500).json({ message: 'Failed to fetch purchase requests' });
    }
  });

  // 구매 요청 조회 (판매자)
  app.get('/api/purchase-requests/seller', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requests = await storage.getPurchaseRequestsBySeller(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching seller purchase requests:', error);
      res.status(500).json({ message: 'Failed to fetch purchase requests' });
    }
  });

  // 구매 요청 상세 조회
  app.get('/api/purchase-requests/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestIdParam = req.params.id;
      if (!requestIdParam) {
        return res.status(400).json({ message: 'Request ID is required' });
      }
      
      const requestId = parseInt(requestIdParam);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Valid request ID is required' });
      }
      
      const request = await storage.getPurchaseRequestById(requestId);
      
      if (!request) {
        return res.status(404).json({ message: 'Purchase request not found' });
      }

      // 구매자 또는 판매자만 조회 가능
      if (request.buyerId !== req.user.id && request.sellerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(request);
    } catch (error) {
      console.error('Error fetching purchase request:', error);
      res.status(500).json({ message: 'Failed to fetch purchase request' });
    }
  });

  // 견적 생성
  app.post('/api/purchase-quotes', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const quoteData = insertPurchaseQuoteSchema.parse({
        ...req.body,
        sellerId: req.user.id,
      });

      const quote = await storage.createPurchaseQuote(quoteData);
      
      console.log(`[PURCHASE-QUOTE] User ${req.user.email} created quote for request ${quoteData.requestId}`);
      res.json(quote);
    } catch (error) {
      console.error('Error creating purchase quote:', error);
      res.status(500).json({ message: 'Failed to create purchase quote' });
    }
  });

  // 견적 조회 (요청별)
  app.get('/api/purchase-requests/:id/quotes', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestIdParam = req.params.id;
      if (!requestIdParam) {
        return res.status(400).json({ message: 'Request ID is required' });
      }
      
      const requestId = parseInt(requestIdParam);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Valid request ID is required' });
      }
      
      const quotes = await storage.getPurchaseQuotesByRequest(requestId);
      res.json(quotes);
    } catch (error) {
      console.error('Error fetching purchase quotes:', error);
      res.status(500).json({ message: 'Failed to fetch purchase quotes' });
    }
  });

  // 주문 생성 (견적 수락)
  app.post('/api/purchase-orders', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orderData = insertPurchaseOrderSchema.parse({
        ...req.body,
        buyerId: req.user.id,
        orderNumber: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      const order = await storage.createPurchaseOrder(orderData);
      
      console.log(`[PURCHASE-ORDER] User ${req.user.email} created order ${orderData.orderNumber}`);
      res.json(order);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ message: 'Failed to create purchase order' });
    }
  });

  // 주문 조회 (구매자)
  app.get('/api/purchase-orders/buyer', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orders = await storage.getPurchaseOrdersByBuyer(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching buyer purchase orders:', error);
      res.status(500).json({ message: 'Failed to fetch purchase orders' });
    }
  });

  // 주문 조회 (판매자)
  app.get('/api/purchase-orders/seller', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orders = await storage.getPurchaseOrdersBySeller(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching seller purchase orders:', error);
      res.status(500).json({ message: 'Failed to fetch purchase orders' });
    }
  });

  // 주문 상태 업데이트
  app.patch('/api/purchase-orders/:id/status', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orderIdParam = req.params.id;
      if (!orderIdParam) {
        return res.status(400).json({ message: 'Order ID is required' });
      }
      
      const orderId = parseInt(orderIdParam);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'Valid order ID is required' });
      }
      
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const order = await storage.updatePurchaseOrderStatus(orderId, status);
      
      if (!order) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      console.log(`[PURCHASE-ORDER-UPDATE] Order ${orderId} status updated to ${status}`);
      res.json(order);
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      res.status(500).json({ message: 'Failed to update purchase order status' });
    }
  });
}
