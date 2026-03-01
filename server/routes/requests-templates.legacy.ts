// Legacy RequestsTemplates routes extracted from server/routes.ts to reduce file size.
import type { Express } from 'express';

export function registerLegacyRequestsTemplatesRoutes(
  app: Express,
  deps: { storage: any; authenticateHybrid: any }
) {
  const { storage, authenticateHybrid } = deps;

  // ==================== 여행자 도움 요청 시스템 API ====================

  // 도움 요청 생성
  app.post('/api/requests/create', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestData = insertHelpRequestSchema.parse({
        ...req.body,
        requesterId: req.user.id,
      });

      const helpRequest = await storage.createHelpRequest(requestData);
      
      console.log(`[HELP-REQUEST] User ${req.user.email} created help request: ${helpRequest.title}`);
      res.json(helpRequest);
    } catch (error) {
      console.error('Error creating help request:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid request data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create help request' });
      }
    }
  });

  // 내가 생성한 도움 요청들 조회
  app.get('/api/requests/my', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requests = await storage.getHelpRequestsByRequester(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching user help requests:', error);
      res.status(500).json({ message: 'Failed to fetch help requests' });
    }
  });

  // 특정 도움 요청 상세 조회
  app.get('/api/requests/:id', authenticateHybrid, async (req: AuthRequest, res) => {
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

      const request = await storage.getHelpRequestById(requestId);
      
      if (!request) {
        return res.status(404).json({ message: 'Help request not found' });
      }

      // 요청자만 자신의 요청을 볼 수 있음 (추후 다른 사용자도 볼 수 있도록 확장 가능)
      if (request.requesterId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      console.log(`[HELP-REQUEST] User ${req.user.email} viewed help request: ${request.title}`);
      res.json(request);
    } catch (error) {
      console.error('Error fetching help request:', error);
      res.status(500).json({ message: 'Failed to fetch help request' });
    }
  });

  // 특정 도움 요청에 대한 응답들 조회
  app.get('/api/requests/:id/responses', authenticateHybrid, async (req: AuthRequest, res) => {
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

      // 요청이 존재하는지 확인하고 접근 권한 체크
      const request = await storage.getHelpRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: 'Help request not found' });
      }

      // 요청 작성자만 응답을 조회할 수 있도록 제한 (나중에 필요시 확장)
      if (request.requesterId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const responses = await storage.getHelpResponsesByRequest(requestId);
      res.json(responses);
    } catch (error) {
      console.error('Error fetching help request responses:', error);
      res.status(500).json({ message: 'Failed to fetch responses' });
    }
  });

  // 도움 요청에 응답하기
  app.post('/api/requests/:id/respond', authenticateHybrid, async (req: AuthRequest, res) => {
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

      // 요청이 존재하는지 확인
      const request = await storage.getHelpRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: 'Help request not found' });
      }

      // 자신의 요청에는 응답할 수 없도록 제한
      if (request.requesterId === req.user.id) {
        return res.status(400).json({ message: 'Cannot respond to your own request' });
      }

      const responseData = insertRequestResponseSchema.parse({
        ...req.body,
        requestId: requestId,
        responderId: req.user.id,
      });

      const response = await storage.createHelpResponse(responseData);
      
      console.log(`[HELP-RESPONSE] User ${req.user.email} responded to request ${requestId}`);
      res.json(response);
    } catch (error) {
      console.error('Error creating help response:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid response data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create response' });
      }
    }
  });

  // ==================== 인플루언서 서비스 템플릿 API ====================

  // 서비스 템플릿 생성
  app.post('/api/templates/create', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templateData = insertServiceTemplateSchema.parse({
        ...req.body,
        creatorId: req.user.id,
      });

      const template = await storage.createServiceTemplate(templateData);
      
      console.log(`[SERVICE-TEMPLATE] User ${req.user.email} created template: ${template.title}`);
      res.json(template);
    } catch (error) {
      console.error('Error creating service template:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid template data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create service template' });
      }
    }
  });

  // 내가 생성한 서비스 템플릿들 조회
  app.get('/api/templates/my', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templates = await storage.getServiceTemplatesByCreator(req.user.id);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching user templates:', error);
      res.status(500).json({ message: 'Failed to fetch service templates' });
    }
  });

  // 활성 서비스 템플릿들 조회 (공개 목록)
  app.get('/api/templates', async (req, res) => {
    try {
      const templateType = req.query.type as string | undefined;
      const templates = await storage.getActiveServiceTemplates(templateType);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching active templates:', error);
      res.status(500).json({ message: 'Failed to fetch service templates' });
    }
  });

  // 특정 서비스 템플릿 상세 조회
  app.get('/api/templates/:id', async (req, res) => {
    try {
      const templateIdParam = req.params.id;
      if (!templateIdParam) {
        return res.status(400).json({ message: 'Template ID is required' });
      }
      
      const templateId = parseInt(templateIdParam);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Valid template ID is required' });
      }

      const template = await storage.getServiceTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: 'Service template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error fetching service template:', error);
      res.status(500).json({ message: 'Failed to fetch service template' });
    }
  });

  // 서비스 템플릿 업데이트
  app.put('/api/templates/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templateIdParam = req.params.id;
      if (!templateIdParam) {
        return res.status(400).json({ message: 'Template ID is required' });
      }
      
      const templateId = parseInt(templateIdParam);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Valid template ID is required' });
      }

      // 템플릿 소유자 확인
      const existingTemplate = await storage.getServiceTemplateById(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Service template not found' });
      }

      if (existingTemplate.creatorId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your template' });
      }

      const updateData = insertServiceTemplateSchema.partial().parse(req.body);
      const updatedTemplate = await storage.updateServiceTemplate(templateId, updateData as any);

      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Failed to update template' });
      }
      
      console.log(`[SERVICE-TEMPLATE] User ${req.user.email} updated template: ${updatedTemplate.title}`);
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating service template:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid template data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to update service template' });
      }
    }
  });

  // 서비스 템플릿 삭제
  app.delete('/api/templates/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templateIdParam = req.params.id;
      if (!templateIdParam) {
        return res.status(400).json({ message: 'Template ID is required' });
      }
      
      const templateId = parseInt(templateIdParam);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Valid template ID is required' });
      }

      // 템플릿 소유자 확인
      const existingTemplate = await storage.getServiceTemplateById(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Service template not found' });
      }

      if (existingTemplate.creatorId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your template' });
      }

      const deleted = await storage.deleteServiceTemplate(templateId);
      if (!deleted) {
        return res.status(404).json({ message: 'Failed to delete template' });
      }
      
      console.log(`[SERVICE-TEMPLATE] User ${req.user.email} deleted template: ${existingTemplate.title}`);
      res.json({ message: 'Service template deleted successfully' });
    } catch (error) {
      console.error('Error deleting service template:', error);
      res.status(500).json({ message: 'Failed to delete service template' });
    }
  });
}
