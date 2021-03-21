import { response, Router } from 'express';
import { createPlayerController } from './useCases/player/create/Create.Core';

const router = Router();

// to think about how to segrate routing system
router.post('/player', (request, response)=> createPlayerController.handleRequest(request, response));

export { router };