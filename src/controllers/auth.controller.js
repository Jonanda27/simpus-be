const authService = require('../services/auth.service');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      const error = new Error('Username dan password wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    const result = await authService.loginUser(username, password);
    
    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    // Ambil data fresh dari database melalui service
    const user = await authService.getUserById(req.user.id);
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
};
