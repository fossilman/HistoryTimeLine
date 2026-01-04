import express from 'express';
import timelineRoutes from './timeline.js';

const router = express.Router();

router.use('/timeline', timelineRoutes);

export default router;

