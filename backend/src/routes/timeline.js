import express from 'express';
import { 
  getTimelineData, 
  searchPerson, 
  getChildDynasties, 
  getLevel0DynastiesByCivilization,
  getAllCivilizations,
  getAllLevel0Dynasties
} from '../controllers/timelineController.js';

const router = express.Router();

router.get('/data', getTimelineData);
router.get('/search', searchPerson);
router.get('/dynasties/:parentId/children', getChildDynasties);
router.get('/dynasties/level0', getLevel0DynastiesByCivilization);
router.get('/civilizations/all', getAllCivilizations);
router.get('/dynasties/all/level0', getAllLevel0Dynasties);

export default router;

