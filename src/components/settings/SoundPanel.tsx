import { useState } from 'react';
import { soundManager } from '@/lib/sound';
import { Volume2, Play } from 'lucide-react';

export function SoundPanel() {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());

  const handleToggle = (val: boolean) => {
    soundManager.setEnabled(val);
    setEnabled(val);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Volume2 className="w-5 h-5 text-primary" />
        <span>提示音通知 (Notification Sounds)</span>
      </h2>
      <p className="text-xs text-muted-foreground">
        当任务执行结束或遇到需要用户交互授权的节点时，自动合成播放提示音，提醒您将注意力切回浏览器。
      </p>

      <div className="border border-border rounded-lg p-4 bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">启用提示音</span>
          <button
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
          <button
            onClick={() => soundManager.playTaskComplete()}
            className="px-3 py-1.5 border border-border rounded-md text-xs font-medium hover:bg-accent flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-500" />
            <span>试听任务完成音 (Complete)</span>
          </button>
          <button
            onClick={() => soundManager.playAttentionRequired()}
            className="px-3 py-1.5 border border-border rounded-md text-xs font-medium hover:bg-accent flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-blue-500" />
            <span>试听交互授权提示音 (Attention)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
