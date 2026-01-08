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
  const isMountedRef = useRef(true);
  const timeoutMs = timeoutMinutes * 60 * 1000; // Конвертуємо хвилини в мілісекунди

  // Оновлюємо refs при зміні
  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Встановлюємо isMountedRef при mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Функція для скидання таймера
  const resetTimer = useCallback(() => {
    // Перевіряємо, чи компонент все ще змонтований
    if (!isMountedRef.current) {
      return;
    }

    // Очищаємо попередній таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Встановлюємо новий таймер
    timeoutRef.current = setTimeout(() => {
      // Перевіряємо, чи компонент все ще змонтований перед викликом callback
      if (isMountedRef.current && onInactiveRef.current) {
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

    // Перевіряємо, чи компонент змонтований
    if (!isMountedRef.current) {
      return;
    }

    console.log('⏰ Inactivity timer started:', timeoutMinutes, 'minutes');
    
    // Встановлюємо початковий таймер
    resetTimer();

    // Додаємо обробники подій для всіх вказаних подій
    const eventOptions = { passive: true, capture: true };
    
    // Створюємо стабільний обробник подій
    const handleActivity = () => {
      // Перевіряємо, чи компонент все ще змонтований
      if (isMountedRef.current) {
        resetTimer();
      }
    };

    // Зберігаємо поточні події для cleanup
    const currentEvents = [...eventsRef.current];
    
    // Додаємо обробники подій
    currentEvents.forEach(eventName => {
      try {
        window.addEventListener(eventName, handleActivity, eventOptions);
        document.addEventListener(eventName, handleActivity, eventOptions);
      } catch (error) {
        console.warn(`Failed to add event listener for ${eventName}:`, error);
      }
    });

    console.log('👂 Listening to events:', currentEvents);

    // Очищення при розмонтуванні
    return () => {
      console.log('🛑 Inactivity timer stopped');
      
      // Позначаємо, що компонент розмонтовується
      isMountedRef.current = false;
      
      // Очищаємо таймер
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Видаляємо обробники подій з безпечною обробкою помилок
      currentEvents.forEach(eventName => {
        try {
          window.removeEventListener(eventName, handleActivity, eventOptions);
          document.removeEventListener(eventName, handleActivity, eventOptions);
        } catch (error) {
          // Ігноруємо помилки видалення обробників (можливо вже видалені)
          // Не логуємо, щоб не засмічувати консоль
        }
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

