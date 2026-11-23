export function printPortfolioSection(section) {
  if (!section) return;
  section.classList.add('qf-print-target');

  const cleanup = () => {
    section.classList.remove('qf-print-target');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, {once: true});

  try {
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
