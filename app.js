(() => {
  // موعد تقديري محلي لبداية ١ رمضان ١٤٤٨ هـ؛ قد يتغير بإعلان رؤية الهلال.
  const ramadanStart = new Date(2027, 1, 8, 0, 0, 0, 0);
  const numberFormat = new Intl.NumberFormat('ar-EG', { useGrouping: false });
  const byId = (id) => document.getElementById(id);
  const nodes = {
    days: byId('days'),
    hours: byId('hours'),
    minutes: byId('minutes'),
    seconds: byId('seconds'),
    status: byId('timer-status'),
    hijri: byId('ramadan-date'),
    gregorian: byId('gregorian-date'),
    today: byId('today-date'),
    share: byId('share-button'),
    shareLabel: byId('share-label'),
    audio: byId('ramadan-music'),
    musicToggle: byId('music-toggle'),
    musicLabel: byId('music-label'),
    ambienceStatus: byId('ambience-status'),
    motionToggle: byId('motion-toggle'),
    motionLabel: byId('motion-label'),
  };

  const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const weekdayFormatter = new Intl.DateTimeFormat('ar', { weekday: 'long' });
  const gregorianFormatter = new Intl.DateTimeFormat('ar', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const todayFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // تصحيح محلي معتمد من المستخدم: عرض تاريخ أم القرى السابق بيوم.
  const HIJRI_DAY_OFFSET = -1;
  let renderedTodayKey = '';
  function updateTodayDate() {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (dateKey === renderedTodayKey) return;
    renderedTodayKey = dateKey;
    const correctedDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + HIJRI_DAY_OFFSET,
    );
    const hijriText = todayFormatter.format(correctedDate).replace('ربيع الآخر', 'ربيع الثاني');
    nodes.today.textContent = `اليوم: ${hijriText}`;
  }

  nodes.hijri.textContent = hijriFormatter.format(ramadanStart);
  nodes.gregorian.textContent = `${weekdayFormatter.format(ramadanStart)}، ${gregorianFormatter.format(ramadanStart)}`;

  function updateCountdown() {
    updateTodayDate();
    const remaining = Math.max(0, ramadanStart.getTime() - Date.now());
    const secondsTotal = Math.floor(remaining / 1000);
    const days = Math.floor(secondsTotal / 86400);
    const hours = Math.floor((secondsTotal % 86400) / 3600);
    const minutes = Math.floor((secondsTotal % 3600) / 60);
    const seconds = secondsTotal % 60;

    nodes.days.textContent = numberFormat.format(days).padStart(3, '٠');
    nodes.hours.textContent = numberFormat.format(hours).padStart(2, '٠');
    nodes.minutes.textContent = numberFormat.format(minutes).padStart(2, '٠');
    nodes.seconds.textContent = numberFormat.format(seconds).padStart(2, '٠');
    nodes.status.textContent = remaining === 0
      ? 'رمضان مبارك — تقبّل الله منّا ومنكم صالح الأعمال'
      : 'لحظةٌ أقرب إلى شهر الرحمة';
  }

  async function shareCountdown() {
    const payload = {
      title: 'العدّ التنازلي لرمضان ١٤٤٨ هـ',
      text: 'بقيت أيام قليلة على شهر رمضان المبارك — تابع العدّ التنازلي معنا.',
      url: window.location.href,
    };
    const originalLabel = 'شارك العدّ التنازلي';
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(payload.url);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = payload.url;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        temporaryInput.remove();
        if (!copied) throw new Error('تعذّر نسخ الرابط');
      }
      nodes.shareLabel.textContent = 'تم نسخ الرابط';
      window.setTimeout(() => { nodes.shareLabel.textContent = originalLabel; }, 2200);
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      nodes.shareLabel.textContent = 'تعذّرت المشاركة، انسخ الرابط من المتصفح';
      window.setTimeout(() => { nodes.shareLabel.textContent = originalLabel; }, 2800);
    }
  }

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionEnabled = !motionPreference.matches;
  function setMotionEnabled(enabled) {
    motionEnabled = Boolean(enabled);
    const root = document.documentElement;
    root.classList.toggle('motion-paused', !motionEnabled);
    root.classList.toggle('motion-user-enabled', motionEnabled && motionPreference.matches);
    nodes.motionToggle.setAttribute('aria-pressed', String(motionEnabled));
    nodes.motionLabel.textContent = motionEnabled ? 'إيقاف الحركة' : 'تشغيل الحركة';
  }

  let musicEnabled = false;
  let volumeAnimation = 0;
  nodes.audio.volume = 0;
  function setMusicButton(enabled) {
    musicEnabled = Boolean(enabled);
    nodes.musicToggle.setAttribute('aria-pressed', String(musicEnabled));
    nodes.musicLabel.textContent = musicEnabled ? 'إيقاف الموسيقى' : 'تشغيل موسيقى رمضانية';
  }

  function fadeVolume(target, duration, onComplete) {
    if (volumeAnimation) window.cancelAnimationFrame(volumeAnimation);
    const startVolume = nodes.audio.volume;
    const startedAt = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      nodes.audio.volume = startVolume + (target - startVolume) * progress;
      if (progress < 1) {
        volumeAnimation = window.requestAnimationFrame(step);
      } else {
        volumeAnimation = 0;
        if (onComplete) onComplete();
      }
    }
    volumeAnimation = window.requestAnimationFrame(step);
  }

  async function toggleMusic() {
    if (musicEnabled) {
      setMusicButton(false);
      nodes.ambienceStatus.textContent = 'تم إيقاف الموسيقى';
      fadeVolume(0, 450, () => nodes.audio.pause());
      return;
    }
    try {
      nodes.audio.volume = 0;
      await nodes.audio.play();
      setMusicButton(true);
      nodes.ambienceStatus.textContent = 'تعمل الآن موسيقى رمضانية هادئة';
      fadeVolume(.22, 800);
    } catch (error) {
      setMusicButton(false);
      nodes.ambienceStatus.textContent = 'تعذّر تشغيل الموسيقى؛ يمكنك المحاولة مجددًا.';
    }
  }

  nodes.share.addEventListener('click', shareCountdown);
  nodes.musicToggle.addEventListener('click', toggleMusic);
  nodes.motionToggle.addEventListener('click', () => setMotionEnabled(!motionEnabled));
  const handleMotionPreference = (event) => {
    if (event.matches) setMotionEnabled(false);
  };
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', handleMotionPreference);
  else if (motionPreference.addListener) motionPreference.addListener(handleMotionPreference);

  setMotionEnabled(motionEnabled);
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
})();
