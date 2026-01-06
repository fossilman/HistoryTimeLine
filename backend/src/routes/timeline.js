import express from 'express';
import { getTimelineData, searchPerson, getChildDynasties, getLevel0DynastiesByCivilization } from '../controllers/timelineController.js';

const router = express.Router();

router.get('/data', getTimelineData);
router.get('/search', searchPerson);
router.get('/dynasties/:parentId/children', getChildDynasties);
router.get('/dynasties/level0', getLevel0DynastiesByCivilization);

export default router;

