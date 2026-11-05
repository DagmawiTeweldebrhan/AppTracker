import { node } from '../utils/dom.js';

export function renderSummary(container, applications) {
  const definitions = [
    ['Total applications', applications.length, 'Every step counts'],
    ['In progress', applications.filter(item => ['Applied', 'Interviewing'].includes(item.status)).length, 'Opportunities still open'],
    ['Interviewing', applications.filter(item => item.status === 'Interviewing').length, 'Conversations in motion'],
    ['Offers received', applications.filter(item => item.status === 'Offer').length, 'Something to celebrate']
  ];
  container.replaceChildren(...definitions.map(([label, count, caption]) => {
    const card = node('div', '', 'stat');
    card.append(node('div', label, 'stat-label'), node('div', String(count), 'stat-value'), node('div', caption, 'stat-caption'));
    return card;
  }));
}
