import React from "react";

export default function DisciplineRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  // Color based on score
  const getColor = () => {
    if (score >= 80) return '#22C55E'; // Green
    if (score >= 50) return '#FBBF24'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <div className="discipline-ring" data-testid="discipline-ring">
      <svg width="120" height="120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="transparent"
          stroke="#27272A"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="transparent"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${getColor()}40)`
          }}
        />
      </svg>
      <div className="score-text">
        <p className="score-value" data-testid="discipline-score">{score}</p>
        <p className="score-label">Discipline</p>
      </div>
    </div>
  );
}
