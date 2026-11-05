export function filterRecords(records, { query = '', status = '', sort = 'newest', emails = false } = {}) {
  const search = query.trim().toLocaleLowerCase();
  return records.filter(item => {
    const searchable = emails ? `${item.subject} ${item.sender}` : `${item.company} ${item.role} ${item.notes}`;
    return (!status || item.status === status) && searchable.toLocaleLowerCase().includes(search);
  }).sort((a, b) => {
    if (sort === 'company') return (emails ? a.sender : a.company).localeCompare(emails ? b.sender : b.company);
    const difference = new Date(emails ? a.dateReceived : a.dateApplied) - new Date(emails ? b.dateReceived : b.dateApplied);
    return sort === 'oldest' ? difference : -difference;
  });
}
