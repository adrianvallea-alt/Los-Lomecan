// src/hooks/useAdaptiveTDEE.js
import { useMemo } from 'react';

const KCAL_PER_KG_FAT = 7700; // Constante termodinámica del tejido adiposo

function calculateWeightTrend(weightLogs) {
  if (!weightLogs || weightLogs.length === 0) return [];
  const sorted = [...weightLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const alpha = 0.2; // Suavizado exponencial para eliminar ruido de líquidos
  let currentTrend = sorted[0].weight;
  
  return sorted.map(entry => {
    currentTrend = (alpha * entry.weight) + ((1 - alpha) * currentTrend);
    return {
      date: entry.date,
      actualWeight: entry.weight,
      trendWeight: parseFloat(currentTrend.toFixed(2))
    };
  });
}

export default function useAdaptiveTDEE(profile, weightLogs = [], dailyIntake = []) {
  return useMemo(() => {
    const minDays = 4; // Mínimo de días para comenzar a dar telemetría
    const validLogs = (weightLogs || []).filter(l => l.weight > 0);
    
    if (!profile || validLogs.length < minDays || (dailyIntake || []).length < minDays) {
      return {
        isCalibrated: false,
        daysTracked: Math.min(validLogs.length, (dailyIntake || []).length),
        minRequiredDays: 7,
        estimatedTDEE: profile?.goals?.cal || 2200,
        weeklyChangeRateKg: 0,
        adjustmentRecommendation: null,
      };
    }

    const trendData = calculateWeightTrend(validLogs);
    const recentTrends = trendData.slice(-14);
    
    const startWeight = recentTrends[0].trendWeight;
    const endWeight = recentTrends[recentTrends.length - 1].trendWeight;
    const firstDate = new Date(recentTrends[0].date);
    const lastDate = new Date(recentTrends[recentTrends.length - 1].date);
    const daysInterval = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)) || recentTrends.length);

    const totalWeightChange = endWeight - startWeight;
    const weeklyRateKg = parseFloat(((totalWeightChange / daysInterval) * 7).toFixed(2));

    // Ingesta media real
    const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const recentIntake = (dailyIntake || []).filter(item => new Date(item.timestamp).getTime() >= fourteenDaysAgo);
    
    const caloriesByDay = {};
    recentIntake.forEach(item => {
      const dayKey = new Date(item.timestamp).toDateString();
      caloriesByDay[dayKey] = (caloriesByDay[dayKey] || 0) + (item.macros?.cal || 0);
    });

    const dailyCaloriesArray = Object.values(caloriesByDay);
    const avgDailyCalories = dailyCaloriesArray.length > 0
      ? dailyCaloriesArray.reduce((a, b) => a + b, 0) / dailyCaloriesArray.length
      : (profile.goals?.cal || 2200);

    const dailyNetSurplusOrDeficit = (totalWeightChange * KCAL_PER_KG_FAT) / daysInterval;
    const realAdaptiveTDEE = Math.round(avgDailyCalories - dailyNetSurplusOrDeficit);

    // Meta según el objetivo
    let targetWeeklyRate = 0;
    if (profile.goal_type === 'lose') targetWeeklyRate = -0.5;
    else if (profile.goal_type === 'gain') targetWeeklyRate = 0.25;

    const targetDeficitOrSurplus = (targetWeeklyRate * KCAL_PER_KG_FAT) / 7;
    const suggestedDailyCal = Math.round(realAdaptiveTDEE + targetDeficitOrSurplus);
    const currentCal = profile.goals?.cal || 2200;
    const calorieDiff = suggestedDailyCal - currentCal;

    let recommendation = null;
    if (Math.abs(calorieDiff) >= 50 && validLogs.length >= 7) {
      recommendation = {
        action: calorieDiff > 0 ? 'increase' : 'decrease',
        diffCalories: Math.abs(calorieDiff),
        newTargetCalories: suggestedDailyCal,
        reason: profile.goal_type === 'lose'
          ? (weeklyRateKg > targetWeeklyRate ? 'La pérdida de peso es más lenta de lo programado.' : 'Estás perdiendo peso más rápido de lo óptimo.')
          : (weeklyRateKg < targetWeeklyRate ? 'La ganancia muscular es menor a la meta.' : 'El superávit calórico es mayor al recomendado.')
      };
    }

    return {
      isCalibrated: true,
      daysTracked: daysInterval,
      minRequiredDays: 7,
      estimatedTDEE: Math.max(1200, Math.min(realAdaptiveTDEE, 4500)),
      avgDailyCalories: Math.round(avgDailyCalories),
      trendWeightCurrent: endWeight,
      weeklyChangeRateKg: weeklyRateKg,
      adjustmentRecommendation: recommendation,
    };
  }, [profile, weightLogs, dailyIntake]);
}