function transformScreens(data) {
  // group by screen
  const grouped = {};
  for (const item of data) {
    const key = item.id;
    if (!grouped[key]) {
      grouped[key] = {
        id: item.id,
        name: item.name,
        screen_type_id: item.screen_type_id,
        total_capacity: item.total_capacity,
        rows: []
      };
    }
    grouped[key].rows.push({
      row_label: item.row_label,
      category_id: item.category_id,
      cols: item.cols
    })
  }

  return Object.values(grouped).map(screen => {
    screen.rows.sort((a, b) => a.row_label.localeCompare(b.row_label));
    const row_ranges = [];
    let start = screen.rows[0];
    let prev = start;

    for (let i = 1; i < screen.rows.length; i++) {
      const curr = screen.rows[i];
      const isConsequtive = curr.row_label.charCodeAt(0) === prev.row_label.charCodeAt(0) + 1;
      const sameGroup = curr.category_id === prev.category_id && curr.cols === prev.cols;
      if (isConsequtive && sameGroup) {
        prev = curr;
      }
      else {
        row_ranges.push({
          rowStart: start.row_label,
          rowEnd: prev.row_label,
          cols: start.cols,
          category_id: start.category_id
        });
        start = curr;
        prev = curr;
      }
    }
    row_ranges.push({
      rowStart: start.row_label,
      rowEnd: prev.row_label,
      cols: start.cols,
      category_id: start.category_id
    });

    return {
      id: screen.id,
      name: screen.name,
      total_capacity: screen.total_capacity,
      screen_type_id: screen.screen_type_id,
      row_ranges
    };
  });
}

module.exports = {
  transformScreens
};
