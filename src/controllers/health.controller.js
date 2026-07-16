const checkHealth = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is healthy and running smoothly',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  checkHealth,
};
