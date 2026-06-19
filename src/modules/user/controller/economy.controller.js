const userModel = require('../../../../DB/models/user.model');

// Define available items in the shop and their prices
const SHOP_ITEMS = {
  // Avatar Borders
  'border_gold': { type: 'avatarBorder', price: 100, name: 'Gold Border' },
  'border_neon': { type: 'avatarBorder', price: 250, name: 'Neon Glow Border' },
  'border_fire': { type: 'avatarBorder', price: 500, name: 'Fire Border' },
  // Car Skins
  'car_red': { type: 'carSkin', price: 150, name: 'Red Racer', color: '#ef4444' },
  'car_purple': { type: 'carSkin', price: 150, name: 'Purple Phantom', color: '#a855f7' },
  'car_gold': { type: 'carSkin', price: 500, name: 'Golden Champion', color: '#fbbf24' },
  // Tank Skins
  'tank_red': { type: 'tankSkin', price: 150, name: 'Red Destroyer', color: '#ef4444' },
  'tank_gold': { type: 'tankSkin', price: 500, name: 'Golden Tank', color: '#fbbf24' }
};

const getShopItems = async (req, res) => {
  try {
    res.json({ message: 'success', items: SHOP_ITEMS });
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
};

const buyItem = async (req, res) => {
  try {
    const userId = req.userData._id;
    const { itemId } = req.body;

    const item = SHOP_ITEMS[itemId];
    if (!item) {
      return res.status(404).json({ message: 'Item not found in shop' });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.unlockedItems && user.unlockedItems.includes(itemId)) {
      return res.status(400).json({ message: 'You already own this item' });
    }

    if (user.coins < item.price) {
      return res.status(400).json({ message: 'Not enough coins' });
    }

    user.coins -= item.price;
    user.unlockedItems.push(itemId);
    await user.save();

    res.json({ message: 'success', coins: user.coins, unlockedItems: user.unlockedItems });
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
};

const equipItem = async (req, res) => {
  try {
    const userId = req.userData._id;
    const { itemId } = req.body;

    const item = SHOP_ITEMS[itemId];
    if (!item && itemId !== null) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (itemId !== null && (!user.unlockedItems || !user.unlockedItems.includes(itemId))) {
      return res.status(400).json({ message: 'You do not own this item' });
    }

    if (itemId === null) {
      // Logic to unequip could be requested by specifying type
      const { type } = req.body;
      if (type === 'avatarBorder') user.currentAvatarBorder = null;
      if (type === 'carSkin') user.currentCarSkin = null;
      if (type === 'tankSkin') user.currentTankSkin = null;
    } else {
      if (item.type === 'avatarBorder') user.currentAvatarBorder = itemId;
      if (item.type === 'carSkin') user.currentCarSkin = itemId;
      if (item.type === 'tankSkin') user.currentTankSkin = itemId;
    }

    await user.save();
    res.json({ message: 'success', currentAvatarBorder: user.currentAvatarBorder, currentCarSkin: user.currentCarSkin, currentTankSkin: user.currentTankSkin });
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
};

const tipStudent = async (req, res) => {
  try {
    const teacherId = req.userData._id;
    const { studentId, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid tip amount' });
    }

    const teacher = await userModel.findById(teacherId);
    if (teacher.role !== 'Teacher') {
      return res.status(403).json({ message: 'Only teachers can tip students' });
    }

    if (teacher.coins < amount) {
      return res.status(400).json({ message: 'Not enough coins to tip' });
    }

    const student = await userModel.findById(studentId);
    if (!student || student.role !== 'Student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    teacher.coins -= amount;
    student.coins += amount;

    await teacher.save();
    await student.save();

    res.json({ message: 'success', coins: teacher.coins });
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
};

module.exports = {
  getShopItems,
  buyItem,
  equipItem,
  tipStudent,
  SHOP_ITEMS
};
