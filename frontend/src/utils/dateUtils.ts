/**
 * 日期工具函数
 * 处理年份与年月日之间的转换
 */

/**
 * 将年份（支持小数）转换为日期对象
 * @param year 年份，可以是小数（如 2024.5 表示 2024年6月）
 * @returns Date 对象
 */
export function yearToDate(year: number): Date {
  const yearInt = Math.floor(year);
  const fraction = year - yearInt;
  
  // 计算总天数（假设每年365天）
  const totalDays = fraction * 365;
  
  // 计算月份（0-11，0表示1月）
  const month = Math.floor(totalDays / 30.44); // 平均每月30.44天
  
  // 计算天数
  const dayFraction = (totalDays / 30.44) - month;
  const day = Math.floor(dayFraction * 30.44) + 1;
  
  // 确保日期有效
  const date = new Date(yearInt, month, Math.min(day, 28));
  
  // 如果月份溢出，调整日期
  if (date.getMonth() !== month) {
    return new Date(yearInt, month, 1);
  }
  
  return date;
}

/**
 * 将日期对象转换为年份（支持小数）
 * @param date Date 对象
 * @returns 年份（小数）
 */
export function dateToYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate();
  
  // 计算该日期在一年中的天数（简化：假设每月30.44天）
  const daysInYear = month * 30.44 + (day - 1);
  
  // 转换为年份小数部分
  const yearFraction = daysInYear / 365;
  
  return year + yearFraction;
}

/**
 * 格式化年份显示
 * @param year 年份（可以是小数）
 * @param viewportSpan 视窗跨度（年）
 * @returns 格式化后的字符串
 */
export function formatTime(year: number, viewportSpan: number): string {
  // 根据视窗跨度决定显示精度
  if (viewportSpan >= 1) {
    // 显示年份
    if (year < 0) {
      return `前${Math.abs(Math.round(year))}`;
    }
    return Math.round(year).toString();
  } else if (viewportSpan >= 1/12) {
    // 显示年月（视窗跨度小于1年但大于1个月）
    const date = yearToDate(year);
    const yearInt = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (yearInt < 0) {
      return `前${Math.abs(yearInt)}年${month}月`;
    }
    return `${yearInt}年${month}月`;
  } else {
    // 显示年月日（视窗跨度小于1个月）
    const date = yearToDate(year);
    const yearInt = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    if (yearInt < 0) {
      return `前${Math.abs(yearInt)}年${month}月${day}日`;
    }
    return `${yearInt}年${month}月${day}日`;
  }
}

/**
 * 格式化时间范围显示
 * @param startYear 起始年份
 * @param endYear 结束年份
 * @param viewportSpan 视窗跨度（年）
 * @returns 格式化后的字符串
 */
export function formatTimeRange(startYear: number, endYear: number, viewportSpan: number): string {
  const start = formatTime(startYear, viewportSpan);
  const end = formatTime(endYear, viewportSpan);
  return `${start} - ${end}`;
}

/**
 * 根据视窗跨度获取时间单位
 * @param viewportSpan 视窗跨度（年）
 * @returns 时间单位信息
 */
export function getTimeUnit(viewportSpan: number): { unit: number; unitName: string; display: string } {
  if (viewportSpan >= 1) {
    // 使用年作为单位
    let unit = 100;
    if (viewportSpan > 1000) unit = 500;
    else if (viewportSpan > 100) unit = 50;
    else if (viewportSpan > 10) unit = 10;
    else if (viewportSpan > 1) unit = 1;
    
    return { unit, unitName: '年', display: `1cm ≈ ${unit}年` };
  } else if (viewportSpan >= 1/12) {
    // 使用月作为单位
    const months = viewportSpan * 12;
    let unit = 12; // 默认1年
    if (months > 120) unit = 60; // 5年
    else if (months > 24) unit = 12; // 1年
    else if (months > 6) unit = 6; // 半年
    else if (months > 1) unit = 1; // 1月
    else unit = 1;
    
    return { unit, unitName: '月', display: `1cm ≈ ${unit}月` };
  } else {
    // 使用日作为单位
    const days = viewportSpan * 365;
    let unit = 30; // 默认1月
    if (days > 365) unit = 365; // 1年
    else if (days > 90) unit = 30; // 1月
    else if (days > 7) unit = 7; // 1周
    else if (days > 1) unit = 1; // 1天
    else unit = 1;
    
    return { unit, unitName: '日', display: `1cm ≈ ${unit}日` };
  }
}

/**
 * 根据视窗跨度获取时间刻度间隔
 * @param viewportSpan 视窗跨度（年）
 * @returns 刻度间隔（年）
 */
export function getTimeMarkInterval(viewportSpan: number): number {
  if (viewportSpan >= 1) {
    // 使用年作为单位
    if (viewportSpan > 5000) return 1000;
    else if (viewportSpan > 1000) return 500;
    else if (viewportSpan > 500) return 100;
    else if (viewportSpan > 100) return 50;
    else if (viewportSpan > 50) return 10;
    else if (viewportSpan > 20) return 5;
    else return 1;
  } else if (viewportSpan >= 1/12) {
    // 使用月作为单位
    const months = viewportSpan * 12;
    if (months > 120) return 12 / 12; // 1年
    else if (months > 60) return 6 / 12; // 半年
    else if (months > 24) return 3 / 12; // 1季度
    else if (months > 12) return 1 / 12; // 1月
    else return 1 / 12; // 1月
  } else {
    // 使用日作为单位
    const days = viewportSpan * 365;
    if (days > 365) return 30 / 365; // 1月
    else if (days > 90) return 7 / 365; // 1周
    else if (days > 30) return 1 / 365; // 1天
    else return 1 / 365; // 1天
  }
}

/**
 * 生成时间刻度数组
 * @param startYear 起始年份
 * @param endYear 结束年份
 * @param viewportSpan 视窗跨度（年）
 * @returns 时间刻度数组（年份）
 */
export function generateTimeMarks(startYear: number, endYear: number, viewportSpan: number): number[] {
  const interval = getTimeMarkInterval(viewportSpan);
  const marks: number[] = [];
  
  // 计算第一个刻度
  let firstMark: number;
  
  if (viewportSpan >= 1) {
    // 按年对齐
    firstMark = Math.ceil(startYear / interval) * interval;
  } else if (viewportSpan >= 1/12) {
    // 按月对齐
    const startDate = yearToDate(startYear);
    const yearInt = startDate.getFullYear();
    const month = startDate.getMonth();
    // 对齐到月份的第一天
    firstMark = dateToYear(new Date(yearInt, month, 1));
    
    // 如果第一个刻度在起始年份之前，移动到下一个月
    if (firstMark < startYear) {
      firstMark = dateToYear(new Date(yearInt, month + 1, 1));
    }
  } else {
    // 按日对齐
    const startDate = yearToDate(startYear);
    const yearInt = startDate.getFullYear();
    const month = startDate.getMonth();
    const day = startDate.getDate();
    firstMark = dateToYear(new Date(yearInt, month, day));
  }
  
  // 生成刻度
  for (let year = firstMark; year <= endYear; year += interval) {
    marks.push(year);
  }
  
  return marks;
}

