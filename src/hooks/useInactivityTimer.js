import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook для відслідковування неактивності користувача
 * Автоматично виконує logout після вказаного часу неактивності
 * 
 * @param {Function} onInactive - Callback функція, яка викликається при неактивності
 * @param {number} timeoutMinutes - Час неактивності в хвилинах (за замовчуванням 15)
 * @param {Array} events - Масив подій для відслідковування (за замовчуванням: mousemove, keydown, click, scroll, touchstart)
 */
export function useInactivityTimer(onInactive, timeoutMinutes = 15, events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']) {
  const timeoutRef = useRef(null);
  const onInactiveRef = useRef(onInactive);
  const eventsRef = useRef(events);
  const timeoutMs = timeoutMinutes * 60 * 1000; // Конвертуємо хвилини в мілісекунди

  // Оновлюємо refs при зміні
  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Функція для скидання таймера
  const resetTimer = useCallback(() => {
    // Очищаємо попередній таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Встановлюємо новий таймер
    timeoutRef.current = setTimeout(() => {
      if (onInactiveRef.current) {
        onInactiveRef.current();
      }
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    // Починаємо відслідковування тільки якщо є callback
    if (!onInactive) {
      // Якщо callback видалено, очищаємо таймер
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    console.log('⏰ Inactivity timer started:', timeoutMinutes, 'minutes');
    
    // Встановлюємо початковий таймер
    resetTimer();

    // Додаємо обробники подій для всіх вказаних подій
    const eventOptions = { passive: true, capture: true };
    
    // Створюємо стабільний обробник подій
    const handleActivity = () => {
      resetTimer();
    };

    const currentEvents = eventsRef.current;
    currentEvents.forEach(eventName => {
      window.addEventListener(eventName, handleActivity, eventOptions);
      document.addEventListener(eventName, handleActivity, eventOptions);
    });

    console.log('👂 Listening to events:', currentEvents);

    // Очищення при розмонтуванні
    return () => {
      console.log('🛑 Inactivity timer stopped');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      currentEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity, eventOptions);
        document.removeEventListener(eventName, handleActivity, eventOptions);
      });
    };
  }, [onInactive, resetTimer, timeoutMinutes]); // events використовується через ref

  // Функція для ручного скидання таймера (можна використовувати ззовні)
  const reset = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return { reset };
}

export default useInactivityTimer;

