import AppError from "./AppError.js";

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Không tìm thấy tuyến đường: ${req.method} ${req.originalUrl}`, 404));
};

export default notFoundHandler;