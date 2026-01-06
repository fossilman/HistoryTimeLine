import express from 'express';
import { getTimelineData, searchPerson } from '../controllers/timelineController.js';

const router = express.Router();

router.get('/data', getTimelineData);
router.get('/search', searchPerson);

export default router;

