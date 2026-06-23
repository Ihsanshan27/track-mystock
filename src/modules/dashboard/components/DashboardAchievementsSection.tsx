import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardAchievement } from '@/modules/dashboard/types/dashboard';

type DashboardAchievementsSectionProps = {
  achievements: DashboardAchievement[];
  marketLabel: string;
};

const iconMap = Icons as Record<string, LucideIcon>;

export default function DashboardAchievementsSection({
  achievements,
  marketLabel,
}: DashboardAchievementsSectionProps) {
  return (
    <div className="dashboard-achievements-section">
      <h3 className="dashboard-achievements-title">
        <Icons.Award size={18} className="dashboard-achievements-icon" />
        Pencapaian Anda ({marketLabel})
      </h3>
      <div className="dashboard-achievements-list">
        {achievements.map((achievement) => {
          const AchievementIcon = iconMap[achievement.icon] || Icons.Award;
          return (
            <div
              key={achievement.id}
              className={`bento-card dashboard-achievement-card ${achievement.unlocked ? 'dashboard-achievement-card-unlocked' : 'dashboard-achievement-card-locked'}`}
            >
              <div className="dashboard-achievement-header">
                <div
                  className={`dashboard-achievement-badge ${achievement.unlocked ? 'dashboard-achievement-badge-unlocked' : 'dashboard-achievement-badge-locked'}`}
                >
                  <AchievementIcon size={20} />
                </div>
                <div>
                  {achievement.unlocked ? (
                    <Icons.Unlock size={14} className="dashboard-achievement-status-unlocked" />
                  ) : (
                    <Icons.Lock size={14} className="dashboard-achievement-status-locked" />
                  )}
                </div>
              </div>
              <div className="dashboard-achievement-name">{achievement.name}</div>
              <div className="dashboard-achievement-desc">{achievement.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
