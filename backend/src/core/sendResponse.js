const sendResponse = (
  res,
  {
    statusCode = 200,
    message = "Yêu cầu đã được xử lý thành công.",
    data = null,
    meta,
  } = {}
) => {
  const responseBody = {
    status: "success",
    message,
    data,
  };

  if (meta !== undefined) {
    responseBody.meta = meta;
  }

  return res.status(statusCode).json(responseBody);
};

export default sendResponse;