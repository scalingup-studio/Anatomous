import { useEffect } from 'react';

/**
 * Hook для блокування зміни значення числових інпутів при скролі
 * Автоматично додає wheel event listener до всіх input[type="number"] на сторінці
 */
export function usePreventNumberInputScroll() {
  useEffect(() => {
    const handleWheel = (e) => {
      // Перевіряємо, чи це числовий інпут
      if (e.target && e.target.type === 'number') {
        // Блокуємо зміну значення при скролі
        e.preventDefault();
        e.stopPropagation();
        // Прибираємо фокус з інпута
        if (e.target.blur) {
          e.target.blur();
        }
      }
    };

    // Додаємо event listener з { passive: false } для можливості викликати preventDefault
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      // Видаляємо event listener при розмонтуванні
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);
}

export default usePreventNumberInputScroll;

