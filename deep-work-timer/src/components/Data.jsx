import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { sessionDB } from '../db/database'

const generateDailyData = (sessions, startDate, endDate) => {
  const data = []
  const currentDate = new Date(startDate)
  let cumulativeHours = 0

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const dayTotal = sessions
      .filter(session => {
        const sessionDate = new Date(session.startTime)
        return sessionDate >= dayStart && sessionDate <= dayEnd
      })
      .reduce((total, session) => total + session.duration, 0)

    cumulativeHours += dayTotal / 60
    
    data.push({
      date: dateStr,
      label: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalHours: Math.round(cumulativeHours * 100) / 100,
      dailyHours: Math.round((dayTotal / 60) * 100) / 100
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return data
}

const generateWeeklyData = (sessions, startDate, endDate) => {
  const data = []
  const currentDate = new Date(startDate)
  currentDate.setDate(currentDate.getDate() - currentDate.getDay()) // Start of week
  let cumulativeHours = 0

  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate)
    const weekEnd = new Date(currentDate)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const weekTotal = sessions
      .filter(session => {
        const sessionDate = new Date(session.startTime)
        return sessionDate >= weekStart && sessionDate <= weekEnd
      })
      .reduce((total, session) => total + session.duration, 0)

    cumulativeHours += weekTotal / 60
    
    data.push({
      date: weekStart.toISOString().split('T')[0],
      label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      totalHours: Math.round(cumulativeHours * 100) / 100,
      weeklyHours: Math.round((weekTotal / 60) * 100) / 100
    })

    currentDate.setDate(currentDate.getDate() + 7)
  }

  return data
}

const generateMonthlyData = (sessions, startDate, endDate) => {
  const data = []
  const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  let cumulativeHours = 0

  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    const monthTotal = sessions
      .filter(session => {
        const sessionDate = new Date(session.startTime)
        return sessionDate >= monthStart && sessionDate <= monthEnd
      })
      .reduce((total, session) => total + session.duration, 0)

    cumulativeHours += monthTotal / 60
    
    data.push({
      date: monthStart.toISOString().split('T')[0],
      label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      totalHours: Math.round(cumulativeHours * 100) / 100,
      monthlyHours: Math.round((monthTotal / 60) * 100) / 100
    })

    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return data
}

const generateYearlyData = (sessions, startDate, endDate) => {
  const data = []
  const currentYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  let cumulativeHours = 0

  for (let year = currentYear; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    const yearTotal = sessions
      .filter(session => {
        const sessionDate = new Date(session.startTime)
        return sessionDate >= yearStart && sessionDate <= yearEnd
      })
      .reduce((total, session) => total + session.duration, 0)

    cumulativeHours += yearTotal / 60
    
    data.push({
      date: yearStart.toISOString().split('T')[0],
      label: year.toString(),
      totalHours: Math.round(cumulativeHours * 100) / 100,
      yearlyHours: Math.round((yearTotal / 60) * 100) / 100
    })
  }

  return data
}

const generateLineChartData = (sessions, range) => {
  const now = new Date()
  let startDate = new Date()
  let format = 'day'
  
  switch (range) {
    case 'week':
      startDate.setDate(now.getDate() - 7)
      format = 'day'
      break
    case 'month':
      startDate.setMonth(now.getMonth() - 1)
      format = 'day'
      break
    case '6months':
      startDate.setMonth(now.getMonth() - 6)
      format = 'week'
      break
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1)
      format = 'month'
      break
    case '5years':
      startDate.setFullYear(now.getFullYear() - 5)
      format = 'year'
      break
    default:
      startDate.setDate(now.getDate() - 7)
  }

  const filteredSessions = sessions.filter(session => 
    new Date(session.startTime) >= startDate
  )

  if (format === 'day') {
    return generateDailyData(filteredSessions, startDate, now)
  } else if (format === 'week') {
    return generateWeeklyData(filteredSessions, startDate, now)
  } else if (format === 'month') {
    return generateMonthlyData(filteredSessions, startDate, now)
  } else {
    return generateYearlyData(filteredSessions, startDate, now)
  }
}

const generateMonthlyHeatmapData = (sessions, month) => {
  const data = {}
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  
  // Get first and last day of the month
  const startDate = new Date(year, monthIndex, 1)
  const endDate = new Date(year, monthIndex + 1, 0)

  sessions.forEach(session => {
    const sessionDate = new Date(session.startTime)
    if (sessionDate >= startDate && sessionDate <= endDate) {
      const dateStr = sessionDate.toISOString().split('T')[0]
      if (!data[dateStr]) {
        data[dateStr] = { date: dateStr, hours: 0, productivity: 0, sessions: 0 }
      }
      data[dateStr].hours += session.duration / 60
      data[dateStr].productivity += session.rating * (session.duration / 60)
      data[dateStr].sessions += 1
    }
  })

  // Convert to array and fill missing dates for the month
  const result = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayData = data[dateStr] || { date: dateStr, hours: 0, productivity: 0, sessions: 0 }
    
    result.push({
      ...dayData,
      productivity: dayData.hours > 0 ? Math.round(dayData.productivity * 100) / 100 : 0
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return result
}

const calculateMonthlyStats = (sessions, currentMonth) => {
  const currentYear = currentMonth.getFullYear()
  const currentMonthIndex = currentMonth.getMonth()
  
  // Current month data
  const currentMonthStart = new Date(currentYear, currentMonthIndex, 1)
  const currentMonthEnd = new Date(currentYear, currentMonthIndex + 1, 0)
  
  // Previous month data
  const prevMonthStart = new Date(currentYear, currentMonthIndex - 1, 1)
  const prevMonthEnd = new Date(currentYear, currentMonthIndex, 0)

  const getCurrentMonthSessions = () => sessions.filter(session => {
    const sessionDate = new Date(session.startTime)
    return sessionDate >= currentMonthStart && sessionDate <= currentMonthEnd
  })

  const getPrevMonthSessions = () => sessions.filter(session => {
    const sessionDate = new Date(session.startTime)
    return sessionDate >= prevMonthStart && sessionDate <= prevMonthEnd
  })

  const currentMonthSessions = getCurrentMonthSessions()
  const prevMonthSessions = getPrevMonthSessions()

  // Calculate average score for current month
  const currentMonthTotalScore = currentMonthSessions.reduce((total, session) => {
    return total + (session.rating * (session.duration / 60))
  }, 0)
  const currentMonthTotalHours = currentMonthSessions.reduce((total, session) => {
    return total + (session.duration / 60)
  }, 0)

  const currentAverage = currentMonthTotalHours > 0 ? currentMonthTotalScore / currentMonthTotalHours : 0

  // Calculate average score for previous month
  const prevMonthTotalScore = prevMonthSessions.reduce((total, session) => {
    return total + (session.rating * (session.duration / 60))
  }, 0)
  const prevMonthTotalHours = prevMonthSessions.reduce((total, session) => {
    return total + (session.duration / 60)
  }, 0)

  const prevAverage = prevMonthTotalHours > 0 ? prevMonthTotalScore / prevMonthTotalHours : 0

  // Calculate percentage change
  const percentageChange = prevAverage > 0 ? ((currentAverage - prevAverage) / prevAverage) * 100 : 0

  return {
    averageScore: Math.round(currentAverage * 100) / 100,
    percentageChange: Math.round(percentageChange * 10) / 10
  }
}

function Data() {
  const [timeRange, setTimeRange] = useState('week')
  const [lineChartData, setLineChartData] = useState([])
  const [heatmapData, setHeatmapData] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthlyStats, setMonthlyStats] = useState({ averageScore: 0, percentageChange: 0 })
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const allSessions = await sessionDB.getAllSessions()
      
      // Generate line chart data
      const lineData = generateLineChartData(allSessions, timeRange)
      setLineChartData(lineData)
      
      // Generate monthly heatmap data
      const heatData = generateMonthlyHeatmapData(allSessions, currentMonth)
      setHeatmapData(heatData)
      
      // Calculate monthly stats
      const stats = calculateMonthlyStats(allSessions, currentMonth)
      setMonthlyStats(stats)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange, currentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getHeatmapColor = (productivity) => {
    if (productivity === 0) return '#ebedf0'
    if (productivity <= 2) return '#c6e48b'
    if (productivity <= 5) return '#7bc96f'
    if (productivity <= 10) return '#239a3b'
    return '#196127'
  }

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const renderHeatmap = () => {
    const year = currentMonth.getFullYear()
    const monthIndex = currentMonth.getMonth()
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    
    // Get first day of month and calculate starting day of week
    const firstDay = new Date(year, monthIndex, 1)
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Get number of days in month
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    
    // Create calendar grid
    const calendarDays = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day)
      const dateStr = date.toISOString().split('T')[0]
      const dayData = heatmapData.find(d => d.date === dateStr) || 
        { date: dateStr, hours: 0, productivity: 0, sessions: 0 }
      calendarDays.push({
        ...dayData,
        day,
        isToday: dateStr === new Date().toISOString().split('T')[0]
      })
    }

    return (
      <div className="heatmap">
        <div className="heatmap-header">
          <div className="heatmap-title-section">
            <h3>Monthly Focus Heatmap</h3>
            <div className="month-navigation">
              <button 
                className="nav-button"
                onClick={() => navigateMonth(-1)}
                title="Previous month"
              >
                ←
              </button>
              <span className="current-month">{monthName}</span>
              <button 
                className="nav-button"
                onClick={() => navigateMonth(1)}
                title="Next month"
              >
                →
              </button>
            </div>
          </div>
          <div className="monthly-stats">
            <div className="stat-item">
              <span className="stat-label">Average Focus Score This Month:</span>
              <span className="stat-value">{monthlyStats.averageScore.toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Change from Last Month:</span>
              <span className={`stat-value ${monthlyStats.percentageChange >= 0 ? 'positive' : 'negative'}`}>
                {monthlyStats.percentageChange >= 0 ? '+' : ''}{monthlyStats.percentageChange.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="legend-colors">
              {[0, 2, 5, 10, 15].map(value => (
                <div 
                  key={value} 
                  className="legend-color" 
                  style={{ backgroundColor: getHeatmapColor(value) }}
                  title={`${value}+ focus score`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
        <div className="calendar-grid">
          <div className="calendar-header">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          <div className="calendar-body">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`calendar-day ${day ? 'has-data' : 'empty'} ${day?.isToday ? 'today' : ''}`}
                style={{ 
                  backgroundColor: day ? getHeatmapColor(day.productivity) : 'transparent'
                }}
                title={day ? `${day.date}: ${day.productivity.toFixed(1)} focus score (${day.hours.toFixed(1)}h)` : ''}
              >
                {day ? day.day : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const formatTooltip = (value, name) => {
    if (name === 'totalHours') {
      return [`${value} hours`, 'Total Hours']
    }
    return [value, name]
  }

  if (loading) {
    return <div className="data-loading">Loading data...</div>
  }

  return (
    <div className="data-container">
      <div className="chart-section">
        <div className="chart-header">
          <h3>Total Hours Over Time</h3>
          <div className="time-range-selector">
            {[
              { value: 'week', label: 'Last Week' },
              { value: 'month', label: 'Last Month' },
              { value: '6months', label: 'Last 6 Months' },
              { value: 'year', label: 'Last Year' },
              { value: '5years', label: 'Last 5 Years' }
            ].map(option => (
              <button
                key={option.value}
                className={`time-range-btn ${timeRange === option.value ? 'active' : ''}`}
                onClick={() => setTimeRange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={formatTooltip} />
              <Line 
                type="monotone" 
                dataKey="totalHours" 
                stroke="#0ac8f2" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="heatmap-section">
        {renderHeatmap()}
      </div>
    </div>
  )
}

export default Data