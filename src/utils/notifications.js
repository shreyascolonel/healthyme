// Browser notifications and reminder scheduler utility

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notifications.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission; // 'granted' | 'denied' | 'default'
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function sendLocalNotification(title, options = {}) {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        ...options
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('Notification constructor error:', e);
      return false;
    }
  }
  return false;
}

// Background scheduler for food & water reminders
let reminderIntervalId = null;
const triggeredToday = new Set();

export function startNotificationScheduler(profile, onTriggerWaterReminder) {
  if (reminderIntervalId) clearInterval(reminderIntervalId);
  if (!profile || !profile.notifications_enabled) return;

  // Run check every 60 seconds
  reminderIntervalId = setInterval(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    // 1. Meal Reminders
    let times = { breakfast: '08:30', lunch: '13:00', dinner: '20:00' };
    try {
      if (typeof profile.meal_reminder_times === 'string') {
        times = JSON.parse(profile.meal_reminder_times);
      } else if (profile.meal_reminder_times) {
        times = profile.meal_reminder_times;
      }
    } catch {}

    const meals = [
      { key: 'breakfast', label: 'Breakfast', time: times.breakfast || '08:30' },
      { key: 'lunch', label: 'Lunch', time: times.lunch || '13:00' },
      { key: 'dinner', label: 'Dinner', time: times.dinner || '20:00' }
    ];

    for (const m of meals) {
      const triggerKey = `${todayStr}_${m.key}_${m.time}`;
      if (currentTimeStr === m.time && !triggeredToday.has(triggerKey)) {
        triggeredToday.add(triggerKey);
        sendLocalNotification(`🥗 ${m.label} Time!`, {
          body: `Time for ${m.label.toLowerCase()}! Tap to open HealthyMe and log your food.`,
          tag: `meal-${m.key}`
        });
      }
    }

    // 2. Water Drink Reminders (during waking hours 9 AM - 9 PM)
    const hour = now.getHours();
    const intervalMins = profile.water_reminder_interval_mins || 120;
    if (hour >= 9 && hour <= 21) {
      const minuteOfDay = hour * 60 + now.getMinutes();
      if (minuteOfDay % intervalMins === 0) {
        const waterKey = `${todayStr}_water_${currentTimeStr}`;
        if (!triggeredToday.has(waterKey)) {
          triggeredToday.add(waterKey);
          sendLocalNotification('💧 Hydration Reminder', {
            body: 'Time to drink water! Tap to log a glass (+250 ml).',
            tag: 'water-reminder'
          });
          if (onTriggerWaterReminder) onTriggerWaterReminder();
        }
      }
    }
  }, 60000);
}
