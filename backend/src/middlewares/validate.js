const validate = (schema, source = "body") => (req, res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) {
    return next(parsed.error);
  }

  req[source] = parsed.data;
  return next();
};

export default validate;