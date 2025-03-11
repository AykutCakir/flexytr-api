const express = require('express');
const router = express.Router();
const { Task, TaskHistory, User } = require('../db');

// Tüm görevleri getir
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { isDeleted: false },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['ad', 'soyad', 'rol']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['ad', 'soyad', 'rol']
        }
      ]
    });
    res.json(tasks);
  } catch (error) {
    console.error('Görevleri getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Yeni görev oluştur
router.post('/', async (req, res) => {
  try {
    const task = await Task.create(req.body);
    
    const creator = await User.findByPk(req.body.creatorId);
    await TaskHistory.create({
      taskId: task.id,
      action: 'Yeni görev oluşturuldu',
      user: creator ? `${creator.ad} ${creator.soyad}` : 'Sistem',
      creatorName: creator ? `${creator.ad} ${creator.soyad}` : 'Sistem',
      newValue: JSON.stringify(task.toJSON())
    });

    const taskWithUser = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['ad', 'soyad', 'rol']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['ad', 'soyad', 'rol']
        }
      ]
    });

    res.status(201).json(taskWithUser);
  } catch (error) {
    console.error('Görev oluşturma hatası:', error);
    res.status(400).json({ error: 'Görev oluşturulamadı' });
  }
});

// Görevi güncelle
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Görev bulunamadı' });
    }

    const getStatusText = (status) => {
      const statusMap = {
        'backlog': 'Beklemede',
        'inProgress': 'Devam Ediyor',
        'review': 'İncelemede',
        'done': 'Tamamlandı'
      };
      return statusMap[status] || status;
    };

    // Durum güncellemesi yapılıyorsa yetki kontrolü yap
    if (req.body.status && req.body.status !== task.status) {
      // Sadece göreve atanan kişi durumu güncelleyebilir
      if (parseInt(task.userId) !== parseInt(req.body.userId)) {
        return res.status(403).json({ error: 'Bu görevi güncelleme yetkiniz yok' });
      }

      // Geçerli durum geçişlerini kontrol et
      const validTransitions = {
        'backlog': ['inProgress'],
        'inProgress': ['review'],
        'review': ['done', 'inProgress'],
        'done': ['review']
      };

      // Geçiş geçerli mi kontrol et
      if (!validTransitions[task.status]?.includes(req.body.status)) {
        return res.status(400).json({ 
          error: `${getStatusText(task.status)} durumundan ${getStatusText(req.body.status)} durumuna geçiş yapılamaz` 
        });
      }

      // Sadece durum güncellemesi yap
      await task.update({ status: req.body.status });

      const updater = await User.findByPk(req.body.userId);
      // Görev geçmişi oluştur
      await TaskHistory.create({
        taskId: task.id,
        action: `Görev durumu "${getStatusText(task.status)}" durumundan "${getStatusText(req.body.status)}" durumuna güncellendi`,
        user: updater ? `${updater.ad} ${updater.soyad}` : 'Sistem',
        creatorName: task.assignee,
        previousValue: JSON.stringify(task.toJSON()),
        newValue: JSON.stringify({ ...task.toJSON(), status: req.body.status })
      });
    } else if (req.body.title || req.body.description || req.body.priority || req.body.dueDate) {
      // Sadece görevin yaratıcısı temel bilgileri güncelleyebilir
      if (parseInt(task.creatorId) !== parseInt(req.body.userId)) {
        return res.status(403).json({ error: 'Sadece görevi oluşturan kişi bu bilgileri güncelleyebilir' });
      }
      
      const previousValue = task.toJSON();
      await task.update(req.body);

      const updater = await User.findByPk(req.body.userId);
      // Görev bilgileri güncellendiğinde geçmişe kaydet
      await TaskHistory.create({
        taskId: task.id,
        action: 'Görev bilgileri güncellendi',
        user: updater ? `${updater.ad} ${updater.soyad}` : 'Sistem',
        creatorName: task.assignee,
        previousValue: JSON.stringify(previousValue),
        newValue: JSON.stringify(task.toJSON())
      });
    }

    const updatedTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['ad', 'soyad', 'rol']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['ad', 'soyad', 'rol']
        }
      ]
    });
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Görev güncelleme hatası:', error);
    res.status(400).json({ error: 'Görev güncellenemedi' });
  }
});

// Görevi sil
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Görev bulunamadı' });
    }

    // Sadece görevin yaratıcısı silebilir
    if (task.creatorId !== req.body.userId) {
      return res.status(403).json({ error: 'Sadece görevin yaratıcısı görevi silebilir' });
    }
    
    const deleter = await User.findByPk(req.body.userId);
    await TaskHistory.create({
      taskId: task.id,
      action: 'Görev silindi',
      user: deleter ? `${deleter.ad} ${deleter.soyad}` : 'Sistem',
      creatorName: task.assignee,
      previousValue: JSON.stringify(task.toJSON())
    });
    
    // Görevi soft delete yap
    await task.update({ isDeleted: true });
    res.status(204).send();
  } catch (error) {
    console.error('Görev silme hatası:', error);
    res.status(400).json({ error: 'Görev silinemedi' });
  }
});

// Görev geçmişini getir
router.get('/:id/history', async (req, res) => {
  try {
    const history = await TaskHistory.findAll({
      where: { taskId: req.params.id },
      order: [['createdAt', 'DESC']]
    });

    // JSON string'leri parse et
    const parsedHistory = history.map(record => ({
      ...record.toJSON(),
      previousValue: record.previousValue ? JSON.parse(record.previousValue) : null,
      newValue: record.newValue ? JSON.parse(record.newValue) : null
    }));

    res.json(parsedHistory);
  } catch (error) {
    console.error('Görev geçmişi getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router; 