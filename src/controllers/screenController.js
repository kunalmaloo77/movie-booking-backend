const {
  createScreen,
  updateScreen,
  findScreensByCinemaId,
  findScreenById,
  findSeatCategoriesByScreen,
  createScreenType,
  findScreenTypes,
  deleteScreenById,
  deleteSeatsByScreenId,
} = require('../models/screenModel');
const { insertSeatsBatch } = require('../utils/seatService');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { transformScreens } = require('../utils/screenService');

const validateRowRangeFields = ({ rowStart, rowEnd, cols, category_id }) => {
  if (!category_id) return 'Category ID is required for each row range';
  if (!Number.isInteger(cols) || cols <= 0)
    return 'Cols must be a positive integer';
  if (!/^[A-Z]$/i.test(rowStart) || !/^[A-Z]$/i.test(rowEnd))
    return 'Row labels must be single letters A-Z';
  return null;
};

const validateRowRanges = (row_ranges) => {
  const seen = new Set();
  for (const { rowStart, rowEnd, cols } of row_ranges) {
    const startCode = rowStart.toUpperCase().charCodeAt(0);
    const endCode = rowEnd.toUpperCase().charCodeAt(0);
    if (startCode > endCode) {
      return `rowStart "${rowStart}" must be <= rowEnd "${rowEnd}"`;
    }
    for (let r = startCode; r <= endCode; r++) {
      for (let c = 1; c <= cols; c++) {
        const key = `${String.fromCharCode(r)}${c}`;
        if (seen.has(key)) {
          return `Seat ${key} is covered by more than one range — ranges must not overlap`;
        }
        seen.add(key);
      }
    }
  }
  return null;
};

const createScreenController = async (req, res) => {
  const { name, cinema_id, screen_type_id, row_ranges } = req.body;
  if (!name || !cinema_id || !screen_type_id || !row_ranges) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Screen name, cinema ID, screen type, and row ranges are required',
      400
    );
  }

  const overlapError = validateRowRanges(row_ranges);
  if (overlapError) {
    throw new AppError('VALIDATION_ERROR', overlapError, 400);
  }

  const total_capacity = row_ranges.reduce((sum, r) => {
    const rows = r.rowEnd.codePointAt(0) - r.rowStart.codePointAt(0) + 1;
    return sum + rows * r.cols;
  }, 0);

  let newScreen;
  try {
    newScreen = await createScreen(
      cinema_id,
      name,
      screen_type_id,
      total_capacity
    );

    for (const element of row_ranges) {
      const fieldError = validateRowRangeFields(element);
      if (fieldError) throw new AppError('VALIDATION_ERROR', fieldError, 400);
      const { rowStart, rowEnd, cols, category_id } = element;
      let seats = [];
      for (let r = rowStart.codePointAt(0); r <= rowEnd.codePointAt(0); r++) {
        for (let c = 1; c <= cols; c++) {
          seats.push({
            row_label: String.fromCodePoint(r),
            column_label: c,
            screen_id: newScreen.id,
            category_id,
          });
        }
      }
      await insertSeatsBatch(seats);
    }
    ApiResponse.success(res, {
      data: { newScreen, row_ranges },
      statusCode: 201,
    });
  } catch (error) {
    // Roll back the screen record if seat insertion failed
    if (newScreen) {
      await deleteScreenById(newScreen.id).catch(() => {});
    }
    throw error;
  }
};

const updateScreenController = async (req, res) => {
  const { screen_id } = req.params;
  if (!screen_id) {
    throw new AppError('MISSING_ID', 'Screen id is required', 400);
  }

  const { name, cinema_id, screen_type_id, row_ranges } = req.body;

  let total_capacity;
  if (row_ranges !== undefined) {
    const overlapError = validateRowRanges(row_ranges);
    if (overlapError) {
      throw new AppError('VALIDATION_ERROR', overlapError, 400);
    }

    for (const range of row_ranges) {
      const fieldError = validateRowRangeFields(range);
      if (fieldError) throw new AppError('VALIDATION_ERROR', fieldError, 400);
    }

    total_capacity = row_ranges.reduce((sum, r) => {
      const rows = r.rowEnd.codePointAt(0) - r.rowStart.codePointAt(0) + 1;
      return sum + rows * r.cols;
    }, 0);
  }

  const updatedScreen = await updateScreen(screen_id, {
    name,
    cinema_id,
    screen_type_id,
    total_capacity,
  });
  console.log('Updated screen:', updatedScreen);
  if (!updatedScreen) {
    throw new AppError('NOT_FOUND', 'Screen not found', 404);
  }

  if (row_ranges !== undefined) {
    await deleteSeatsByScreenId(screen_id);

    for (const { rowStart, rowEnd, cols, category_id } of row_ranges) {
      const seats = [];
      for (let r = rowStart.codePointAt(0); r <= rowEnd.codePointAt(0); r++) {
        for (let c = 1; c <= cols; c++) {
          seats.push({
            row_label: String.fromCodePoint(r),
            column_label: c,
            screen_id: updatedScreen.id,
            category_id,
          });
        }
      }
      await insertSeatsBatch(seats);
    }
  }

  ApiResponse.success(res, { data: { updatedScreen, row_ranges } });
};

const getScreensByCinemaId = async (req, res) => {
  const { cinema_id } = req.params;
  const screens = await findScreensByCinemaId(cinema_id);
  const transformedScreens = transformScreens(screens);
  ApiResponse.success(res, { data: transformedScreens });
};

const getScreenById = async (req, res) => {
  const { id } = req.params;
  const screen = await findScreenById(id);
  ApiResponse.success(res, { data: screen });
};

const getSeatCategoriesByScreen = async (req, res) => {
  const { screen_id } = req.params;
  const seat_categories = await findSeatCategoriesByScreen(screen_id);
  ApiResponse.success(res, { data: seat_categories });
};

const createScreenTypeController = async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    throw new AppError('VALIDATION_ERROR', 'Screen type name is required', 400);
  }
  const newScreenType = await createScreenType(name, description);
  ApiResponse.success(res, { data: newScreenType, statusCode: 201 });
};

const getScreenTypesController = async (req, res) => {
  const screenTypes = await findScreenTypes();
  ApiResponse.success(res, { data: screenTypes });
};

const deleteScreenController = async (req, res) => {
  const { id } = req.params;
  await deleteScreenById(id);
  ApiResponse.success(res, {
    data: null,
    message: 'Screen deleted successfully',
  });
};

module.exports = {
  createScreenController,
  getScreensByCinemaId,
  getScreenById,
  getSeatCategoriesByScreen,
  createScreenTypeController,
  getScreenTypesController,
  deleteScreenController,
  updateScreenController,
};
