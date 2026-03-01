const express = require("express");
const {
    createRegionController,
    findRegionByCityNameController,
    findAllRegionsController,
} = require("../controllers/regionController.js");
const { adminVerification } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", adminVerification, createRegionController);
router.get("/:city_name", findRegionByCityNameController);
router.get("/", findAllRegionsController);

module.exports = router;
