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
  // Логуємо отриманий параметр для діагностики
  // console.log('🔧 useInactivityTimer called with timeoutMinutes:', timeoutMinutes);
  
  const timeoutRef = useRef(null);
  const onInactiveRef = useRef(onInactive);
  const eventsRef = useRef(events);
  const isMountedRef = useRef(true);
  const timeoutMsRef = useRef(timeoutMinutes * 60 * 1000);
  const handleActivityRef = useRef(null);
  const resetTimerRef = useRef(null);

  // Оновлюємо refs при зміні
  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    timeoutMsRef.current = timeoutMinutes * 60 * 1000;
  }, [timeoutMinutes]);

  // Встановлюємо isMountedRef при mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Функція для скидання таймера - зберігаємо в ref для стабільності
  resetTimerRef.current = () => {
    // Перевіряємо, чи компонент все ще змонтований
    if (!isMountedRef.current) {
      return;
    }

    // Очищаємо попередній таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Встановлюємо новий таймер з актуальним значенням timeoutMs
    timeoutRef.current = setTimeout(() => {
      // Перевіряємо, чи компонент все ще змонтований перед викликом callback
      if (isMountedRef.current && onInactiveRef.current) {
         // console.log('⏰ Inactivity timeout reached, calling callback');
        onInactiveRef.current();
      }
    }, timeoutMsRef.current);
  };

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

    //console.log('⏰ Inactivity timer started:', timeoutMinutes, 'minutes');
    
    // Створюємо стабільний обробник подій і зберігаємо в ref
    handleActivityRef.current = (event) => {
      // Перевіряємо, чи компонент все ще змонтований
      if (isMountedRef.current && resetTimerRef.current) {
        resetTimerRef.current();
      }
    };

    // Встановлюємо початковий таймер
    if (resetTimerRef.current) {
      resetTimerRef.current();
    }

    // Додаємо обробники подій для всіх вказаних подій
    const eventOptions = { passive: true, capture: true };
    
    // Зберігаємо поточні події для cleanup
    const currentEvents = [...eventsRef.current];
    
    // Додаємо обробники подій
    currentEvents.forEach(eventName => {
      try {
        window.addEventListener(eventName, handleActivityRef.current, eventOptions);
        document.addEventListener(eventName, handleActivityRef.current, eventOptions);
      } catch (error) {
        console.warn(`Failed to add event listener for ${eventName}:`, error);
      }
    });

    //console.log('👂 Listening to events:', currentEvents);

    // Очищення при розмонтуванні
    return () => {
     // console.log('🛑 Inactivity timer stopped');
      
      // Позначаємо, що компонент розмонтовується
      isMountedRef.current = false;
      
      // Очищаємо таймер
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Видаляємо обробники подій з безпечною обробкою помилок
      if (handleActivityRef.current) {
        currentEvents.forEach(eventName => {
          try {
            window.removeEventListener(eventName, handleActivityRef.current, eventOptions);
            document.removeEventListener(eventName, handleActivityRef.current, eventOptions);
          } catch (error) {
            // Ігноруємо помилки видалення обробників (можливо вже видалені)
            // Не логуємо, щоб не засмічувати консоль
          }
        });
      }
    };
  }, [onInactive]); // Видалено resetTimer та timeoutMinutes - використовуються через refs

  // Функція для ручного скидання таймера (можна використовувати ззовні)
  const reset = useCallback(() => {
    if (resetTimerRef.current) {
      resetTimerRef.current();
    }
  }, []);

  return { reset };
}

export default useInactivityTimer;

