import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import Geolocation from 'react-native-geolocation-service';
import { PERMISSIONS, request as reqPerm, RESULTS } from 'react-native-permissions';
import Svg, { Circle } from 'react-native-svg';
import { attendanceAPI } from '../services/api';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const FACE_FAIL_KEYWORDS = [
  'face', 'match', 'recogni', 'verify', 'mismatch', 'biometric', 'not match',
];

const C = {
  bg:      '#0f1623',
  card:    '#1a2336',
  card2:   '#243047',
  card3:   '#0f1623',
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.06)',
  text:    '#f0f4ff',
  muted:   '#8b9ab5',
  ghost:   '#5a6a85',
  dark:    '#3a4a65',
  green:   '#22c55e',
  red:     '#ef4444',
  blue:    '#4f8eff',
  amber:   '#f59e0b',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

const fmtTime = (iso?: string) => {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const isFaceMismatch = (msg = '') =>
  FACE_FAIL_KEYWORDS.some(k => msg.toLowerCase().includes(k));

// ─── COUNTDOWN RING ──────────────────────────────────────────────────────────
function CountdownRing({
  countdown, loading, captureMode,
}: {
  countdown: number; loading: boolean; captureMode: 'checkin' | 'checkout';
}) {
  const RADIUS = 36;
  const CIRC   = 2 * Math.PI * RADIUS;
  const dashLen = loading ? CIRC * 0.25 : CIRC * (countdown / 3);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const loopRef  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loading) {
      loopRef.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      spinAnim.setValue(0);
    }
    return () => { loopRef.current?.stop(); };
  }, [loading]);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const strokeColor = loading ? C.blue : captureMode === 'checkin' ? C.green : C.red;

  return (
    <View style={styles.ringWrap}>
      {loading ? (
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Svg width={96} height={96} viewBox="0 0 96 96">
            <Circle cx={48} cy={48} r={RADIUS} stroke="rgba(255,255,255,0.07)" strokeWidth={5} fill="none" />
            <Circle cx={48} cy={48} r={RADIUS} stroke={strokeColor} strokeWidth={5}
              strokeLinecap="round" strokeDasharray={`${dashLen} ${CIRC}`}
              fill="none" rotation={-90} originX={48} originY={48} />
          </Svg>
        </Animated.View>
      ) : (
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={RADIUS} stroke="rgba(255,255,255,0.07)" strokeWidth={5} fill="none" />
          <Circle cx={48} cy={48} r={RADIUS} stroke={strokeColor} strokeWidth={5}
            strokeLinecap="round" strokeDasharray={`${dashLen} ${CIRC}`}
            fill="none" rotation={-90} originX={48} originY={48} />
        </Svg>
      )}
      <View style={styles.ringCenter}>
        {loading
          ? <Text style={styles.ringEmoji}>🔍</Text>
          : countdown === 0
            ? <Text style={styles.ringEmoji}>📸</Text>
            : <Text style={styles.ringNum}>{countdown}</Text>}
      </View>
    </View>
  );
}

// ─── STATUS PILL ─────────────────────────────────────────────────────────────
function StatusPill({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.spLabel}>{label}</Text>
      <Text style={[styles.spVal, value ? styles.spGreen : styles.spMuted]}>{value || '—'}</Text>
    </View>
  );
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    present:  { bg: 'rgba(34,197,94,0.12)',  color: C.green, label: 'Present'  },
    absent:   { bg: 'rgba(239,68,68,0.12)',  color: C.red,   label: 'Absent'   },
    half_day: { bg: 'rgba(245,158,11,0.12)', color: C.amber, label: 'Half Day' },
    late:     { bg: 'rgba(239,68,68,0.1)',   color: C.red,   label: 'Late'     },
  };
  const conf = map[status] ?? { bg: 'rgba(255,255,255,0.06)', color: C.muted, label: status };
  return (
    <View style={[styles.badge, { backgroundColor: conf.bg }]}>
      <Text style={[styles.badgeText, { color: conf.color }]}>{conf.label}</Text>
    </View>
  );
}

// ─── DETAIL STAT ─────────────────────────────────────────────────────────────
function DetailStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.detailStat}>
      <Text style={styles.detailStatLabel}>{label}</Text>
      <Text style={[styles.detailStatVal, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

// ─── PUNCH SECTION ───────────────────────────────────────────────────────────
function PunchSection({ title, dotColor, punches, type }: {
  title: string; dotColor: string; punches: any[]; type: 'in' | 'out';
}) {
  return (
    <View style={styles.punchSection}>
      <View style={styles.punchSectionHead}>
        <View style={[styles.punchDot, { backgroundColor: dotColor }]} />
        <Text style={styles.punchSectionTitle}>{title}</Text>
      </View>
      {punches.length === 0 ? (
        <Text style={styles.emptyPunch}>No check-{type === 'in' ? 'ins' : 'outs'} recorded</Text>
      ) : punches.map((p: any, i: number) => (
        <View key={i} style={styles.punchItem}>
          <View>
            <Text style={styles.punchTime}>{fmtTime(p.time)}</Text>
            <View style={styles.punchMeta}>
              <Text style={styles.punchMetaText}>Punch #{i + 1}</Text>
              {type === 'in' && (
                <View style={[styles.punchTag,
                  { backgroundColor: p.isLate ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }]}>
                  <Text style={[styles.punchTagText, { color: p.isLate ? C.red : C.green }]}>
                    {p.isLate ? `Late ${p.lateByMinutes}m` : 'On time'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.punchRight}>
            <View style={[styles.punchScore,
              { backgroundColor: p.faceMatchScore < 0.45 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }]}>
              <Text style={[styles.punchScoreText, { color: p.faceMatchScore < 0.45 ? C.green : C.red }]}>
                Face {p.faceMatchScore?.toFixed(3)}
              </Text>
            </View>
            {p.faceVerified && <Text style={styles.punchVerified}>✓ Verified</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function AttendanceScreen() {
  const [records,      setRecords]      = useState<any[]>([]);
  const [showCamera,   setShowCamera]   = useState(false);
  const [captureMode,  setCaptureMode]  = useState<'checkin' | 'checkout'>('checkin');
  const [loading,      setLoading]      = useState(false);
  const [now,          setNow]          = useState(new Date());
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [countdown,    setCountdown]    = useState(3);
  const [faceFailMsg,  setFaceFailMsg]  = useState<string | null>(null);

  const cameraRef       = useRef<Camera>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureFiredRef = useRef(false);
  const loadingRef      = useRef(false);
  const captureModeRef  = useRef<'checkin' | 'checkout'>('checkin');

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  // Keep refs in sync with state
  useEffect(() => { loadingRef.current     = loading;     }, [loading]);
  useEffect(() => { captureModeRef.current = captureMode; }, [captureMode]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch monthly attendance
  const fetchAttendance = useCallback(async () => {
    try {
      const res = await attendanceAPI.getAll({
        month: now.getMonth() + 1,
        year:  now.getFullYear(),
      });
      setRecords(res?.data?.records ?? res?.data ?? []);
    } catch {
      Alert.alert('Error', 'Failed to fetch attendance');
    }
  }, [now]);

  useEffect(() => { fetchAttendance(); }, []);

  // ─── STOP COUNTDOWN ────────────────────────────────────────────────────────
  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    captureFiredRef.current = false;
    setCountdown(3);
  }, []);

  // ─── LOCATION HELPER ───────────────────────────────────────────────────────
  const getLocation = useCallback(
    (): Promise<{ latitude: number; longitude: number } | null> => {
      return new Promise(resolve => {
        const perm =
          Platform.OS === 'ios'
            ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
            : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

        reqPerm(perm)
          .then(result => {
            if (result !== RESULTS.GRANTED) { resolve(null); return; }
            Geolocation.getCurrentPosition(
              pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              ()   => resolve(null),
              { timeout: 5000, enableHighAccuracy: true },
            );
          })
          .catch(() => resolve(null));
      });
    },
    [],
  );

  // ─── HANDLE CAPTURE ────────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      console.warn('[Attendance] Camera ref not ready');
      return;
    }

    setLoading(true);

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      const location = await getLocation();

      const formData = new FormData();
      formData.append('selfie', {
        uri:  Platform.OS === 'android' ? `file://${photo.path}` : photo.path,
        name: 'selfie.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('latitude',  String(location?.latitude  ?? 0));
      formData.append('longitude', String(location?.longitude ?? 0));
      formData.append('address',   'GPS captured');

      const mode = captureModeRef.current;

      if (mode === 'checkin') {
        await attendanceAPI.checkIn(formData);
      } else {
        await attendanceAPI.checkOut(formData);
      }

      setShowCamera(false);
      await fetchAttendance();
      Alert.alert('Success', mode === 'checkin' ? 'Checked in successfully!' : 'Checked out successfully!');

    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message
        ?? err?.message
        ?? 'Action failed';

      console.log('[Attendance] Capture error:', msg);

      setShowCamera(false);

      if (isFaceMismatch(msg)) {
        setFaceFailMsg(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
      captureFiredRef.current = false;
    }
  }, [fetchAttendance, getLocation]);

  // ─── START COUNTDOWN ───────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    stopCountdown();
    captureFiredRef.current = false;

    let current = 3;
    setCountdown(3);

    countdownRef.current = setInterval(() => {
      current -= 1;
      setCountdown(current);

      if (current <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;

        if (!captureFiredRef.current && !loadingRef.current) {
          captureFiredRef.current = true;
          handleCapture();
        }
      }
    }, 1000);
  }, [handleCapture, stopCountdown]);

  // When camera modal opens/closes
  useEffect(() => {
    if (!showCamera) {
      stopCountdown();
      return;
    }

    const initDelay = setTimeout(() => {
      startCountdown();
    }, 800);

    return () => {
      clearTimeout(initDelay);
      stopCountdown();
    };
  }, [showCamera]);

  // Open camera with permission check
  const openCamera = async (mode: 'checkin' | 'checkout') => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Camera access is required to mark attendance.');
        return;
      }
    }
    setCaptureMode(mode);
    captureModeRef.current = mode;
    setShowCamera(true);
  };

  // Open detail record
  const openDetail = async (id: string) => {
    setDetailRecord({ _id: id, _loading: true });
    try {
      const res = await attendanceAPI.getById(id);
      setDetailRecord(res?.data ?? res);
    } catch {
      Alert.alert('Error', 'Failed to load detail');
      setDetailRecord(null);
    }
  };

  // Derived today values
  const todayRecord = records.find(r => {
    if (!r.date) return false;
    const d = new Date(r.date);
    return d.getFullYear() === now.getFullYear()
        && d.getMonth()    === now.getMonth()
        && d.getDate()     === now.getDate();
  });

  const checkInTime  = fmtTime(todayRecord?.checkIns?.[0]?.time);
  const checkOutTime = fmtTime(todayRecord?.checkOuts?.[0]?.time);

  const workedHours = (() => {
    if (!todayRecord?.checkIns?.[0]?.time) return null;
    if (todayRecord?.checkOuts?.[0]?.time)
      return todayRecord.workingHours > 0 ? `${todayRecord.workingHours.toFixed(1)}h` : null;
    const diffH = (now.getTime() - new Date(todayRecord.checkIns[0].time).getTime()) / 3600000;
    return diffH > 0 ? `${diffH.toFixed(1)}h` : null;
  })();

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Attendance</Text>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>
            {WEEKDAYS[now.getDay()]} {pad(now.getDate())} {MONTHS[now.getMonth()]}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* TODAY CARD */}
        <View style={styles.todayCard}>
          <View style={styles.liveLabelRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>Today</Text>
          </View>
          <Text style={styles.bigTime}>{pad(now.getHours())}:{pad(now.getMinutes())}</Text>
          <Text style={styles.subText}>
            {WEEKDAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}
          </Text>
          <View style={styles.statusRow}>
            <StatusPill label="Check In"  value={checkInTime}  />
            <StatusPill label="Check Out" value={checkOutTime} />
            <StatusPill label="Hours"     value={workedHours}  />
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.checkinBtn]}
            onPress={() => openCamera('checkin')} activeOpacity={0.82}>
            <Text style={styles.btnIcon}>✔</Text>
            <Text style={styles.btnLabel}>Check In</Text>
            <Text style={styles.btnSub}>Tap to mark arrival</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.checkoutBtn]}
            onPress={() => openCamera('checkout')} activeOpacity={0.82}>
            <Text style={styles.btnIcon}>✖</Text>
            <Text style={styles.btnLabel}>Check Out</Text>
            <Text style={styles.btnSub}>Tap to mark departure</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION HEADER */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <Text style={styles.sectionSub}>{MONTHS[now.getMonth()]} {now.getFullYear()}</Text>
        </View>

        {/* RECORDS */}
        {records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No attendance records this month</Text>
          </View>
        ) : records.map((r, idx) => {
          const d     = new Date(r.date);
          const ciVal = fmtTime(r.checkIns?.[0]?.time);
          const coVal = fmtTime(r.checkOuts?.[0]?.time);
          return (
            <TouchableOpacity key={r._id ?? idx} style={styles.recordCard}
              onPress={() => openDetail(r._id)} activeOpacity={0.75}>
              <View style={styles.dateBlock}>
                <Text style={styles.dayNum}>{pad(d.getDate())}</Text>
                <Text style={styles.dayName}>{WEEKDAYS[d.getDay()]}</Text>
              </View>
              <View style={styles.vDivider} />
              <View style={styles.recordBody}>
                <View style={styles.timesRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeLabel}>In</Text>
                    <Text style={[styles.timeVal, !ciVal && styles.timeValDash]}>{ciVal || '—'}</Text>
                  </View>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeLabel}>Out</Text>
                    <Text style={[styles.timeVal, !coVal && styles.timeValDash]}>{coVal || '—'}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Badge status={r.status} />
                  {r.isLate && (
                    <View style={styles.lateBadge}>
                      <Text style={styles.lateBadgeText}>Late {r.lateByMinutes}m</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.recordHours}>{r.workingHours ? `${r.workingHours.toFixed(1)}h` : '—'}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── MODAL: Camera ── */}
      <Modal visible={showCamera} animationType="slide" transparent
        onRequestClose={() => { if (!loading) setShowCamera(false); }}>
        <Pressable style={styles.overlay} onPress={() => { if (!loading) setShowCamera(false); }}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{captureMode === 'checkin' ? 'Check In' : 'Check Out'}</Text>
                <Text style={styles.modalSubTitle}>Look straight at the camera</Text>
              </View>
              {!loading && (
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCamera(false)}>
                  <Text style={styles.closeBtnText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.autocapBody}>
              <CountdownRing countdown={countdown} loading={loading} captureMode={captureMode} />
              {!loading ? (
                <>
                  <Text style={styles.autocapLabel}>Capturing in {countdown}s…</Text>
                  <Text style={styles.autocapSub}>Your photo will be taken automatically</Text>
                </>
              ) : (
                <>
                  <Text style={styles.autocapLabel}>Validating face…</Text>
                  <View style={styles.processingRow}>
                    <ActivityIndicator color={C.blue} size="small" />
                    <Text style={styles.processingText}>Processing biometric data</Text>
                  </View>
                </>
              )}
            </View>

            {/* Camera: visually hidden but mounted so takePhoto() works */}
            {device && hasPermission && (
              <View style={styles.hiddenCam}>
                <Camera
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  device={device}
                  isActive={showCamera}
                  photo={true}
                  onError={e => console.warn('[Camera] Error:', e.message)}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: Detail ── */}
      <Modal visible={!!detailRecord} animationType="slide" transparent
        onRequestClose={() => setDetailRecord(null)}>
        <Pressable style={styles.overlay} onPress={() => setDetailRecord(null)}>
          <Pressable style={[styles.sheet, styles.detailSheet]} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Attendance Detail</Text>
                {!detailRecord?._loading && detailRecord?.date && (
                  <Text style={styles.modalSubTitle}>
                    {(() => {
                      const d = new Date(detailRecord.date);
                      return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
                    })()}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailRecord(null)}>
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {detailRecord?._loading ? (
                <View style={styles.skeleton}>
                  {[80, 60, 100, 60, 80].map((w, i) => (
                    <View key={i} style={[styles.skelRow, { width: `${w}%` as any }]} />
                  ))}
                </View>
              ) : detailRecord ? (
                <View style={styles.detailBody}>
                  <View style={styles.detailStatsGrid}>
                    <DetailStat label="Status"
                      value={detailRecord.status === 'half_day' ? 'Half Day'
                        : detailRecord.status?.charAt(0).toUpperCase() + detailRecord.status?.slice(1)}
                      color={detailRecord.status === 'present' ? C.green
                        : detailRecord.status === 'absent' ? C.red : C.amber} />
                    <DetailStat label="Hours"
                      value={detailRecord.workingHours > 0 ? `${detailRecord.workingHours.toFixed(2)}h` : '—'}
                      color={detailRecord.workingHours > 0 ? C.green : undefined} />
                    <DetailStat label="Overtime"
                      value={detailRecord.overtimeHours > 0 ? `${detailRecord.overtimeHours.toFixed(2)}h` : '—'}
                      color={detailRecord.overtimeHours > 0 ? C.amber : undefined} />
                    <DetailStat label="Late"
                      value={detailRecord.isLate ? `${detailRecord.lateByMinutes}m` : 'On time'}
                      color={detailRecord.isLate ? C.red : C.green} />
                    <DetailStat label="Punches"
                      value={String((detailRecord.checkIns?.length || 0) + (detailRecord.checkOuts?.length || 0))} />
                  </View>
                  <PunchSection title={`Check Ins (${detailRecord.checkIns?.length || 0})`}
                    dotColor={C.green} punches={detailRecord.checkIns ?? []} type="in" />
                  <PunchSection title={`Check Outs (${detailRecord.checkOuts?.length || 0})`}
                    dotColor={C.red} punches={detailRecord.checkOuts ?? []} type="out" />
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL: Face-fail ── */}
      <Modal visible={!!faceFailMsg} animationType="fade" transparent
        onRequestClose={() => setFaceFailMsg(null)}>
        <View style={styles.faceOverlay}>
          <View style={styles.faceCard}>
            <View style={styles.faceIconCircle}>
              <Text style={{ fontSize: 28 }}>😶</Text>
            </View>
            <Text style={styles.faceTitle}>Face Not Recognised</Text>
            <View style={styles.faceMsgBox}>
              <Text style={styles.faceMsgText}>{faceFailMsg}</Text>
            </View>
            <Text style={styles.faceHint}>
              Make sure your face is well-lit and clearly visible, then try again.
            </Text>
            <View style={styles.faceActions}>
              <TouchableOpacity style={styles.faceRetry} activeOpacity={0.85}
                onPress={() => {
                  setFaceFailMsg(null);
                  setTimeout(() => setShowCamera(true), 250);
                }}>
                <Text style={styles.faceRetryText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.faceDismiss} activeOpacity={0.75}
                onPress={() => setFaceFailMsg(null)}>
                <Text style={styles.faceDismissText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 12, backgroundColor: 'rgba(15,22,35,0.95)',
    borderBottomWidth: 1, borderBottomColor: C.border },
  topBarTitle: { fontSize: 18, fontWeight: '600', color: C.text, letterSpacing: -0.3 },
  dateChip: { backgroundColor: C.card2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border },
  dateChipText: { fontSize: 12, color: C.muted },

  todayCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: C.border },
  liveLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.green },
  liveLabel: { fontSize: 11, fontWeight: '500', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  bigTime: { fontSize: 38, fontWeight: '400', color: C.text, letterSpacing: -1 },
  subText: { fontSize: 13, color: C.muted, marginTop: 4 },
  statusRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statusPill: { flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.border },
  spLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.7,
    color: C.ghost, marginBottom: 3 },
  spVal: { fontSize: 15, fontWeight: '500' },
  spGreen: { color: C.green },
  spMuted: { color: C.muted },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, borderRadius: 16, padding: 18, alignItems: 'flex-start', gap: 4 },
  checkinBtn: { backgroundColor: '#15803d' },
  checkoutBtn: { backgroundColor: '#b91c1c' },
  btnIcon: { fontSize: 22, color: '#fff' },
  btnLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: C.muted },
  sectionSub: { fontSize: 11, color: C.blue },

  recordCard: { flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(26,35,54,0.9)', borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 14, marginBottom: 8 },
  dateBlock: { minWidth: 40, alignItems: 'center' },
  dayNum: { fontSize: 22, fontWeight: '500', color: C.text, lineHeight: 26 },
  dayName: { fontSize: 10, color: C.ghost, fontWeight: '500', textTransform: 'uppercase', marginTop: 2 },
  vDivider: { width: 1, height: 40, backgroundColor: C.border },
  recordBody: { flex: 1, minWidth: 0 },
  timesRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 4 },
  timeCol: {},
  timeLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: C.ghost, fontWeight: '500' },
  timeVal: { fontSize: 14, color: C.text, fontWeight: '500', marginTop: 1 },
  timeValDash: { color: C.ghost },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  recordHours: { fontSize: 13, fontWeight: '500', color: C.muted },
  chevron: { fontSize: 18, color: C.dark, marginLeft: 2 },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  lateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.1)' },
  lateBadgeText: { fontSize: 10, color: C.red },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: C.ghost },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { backgroundColor: C.card, width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: C.border, paddingBottom: 36, maxHeight: '90%' },
  detailSheet: { maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border2 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  modalSubTitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.card2,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 20, color: C.muted, lineHeight: 22 },

  autocapBody: { padding: 32, paddingTop: 24, alignItems: 'center', gap: 12 },
  autocapLabel: { fontSize: 16, fontWeight: '600', color: C.text },
  autocapSub: { fontSize: 13, color: C.muted, textAlign: 'center' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  processingText: { fontSize: 13, color: C.muted },

  ringWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontSize: 36, fontWeight: '500', color: C.text },
  ringEmoji: { fontSize: 28 },

  hiddenCam: { height: 1, width: '100%', overflow: 'hidden', opacity: 0 },

  detailBody: { padding: 16 },
  detailStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  detailStat: { width: '30%', flexGrow: 1, backgroundColor: C.card2, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.border },
  detailStatLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6,
    color: C.ghost, fontWeight: '500', marginBottom: 4 },
  detailStatVal: { fontSize: 15, fontWeight: '500', color: C.text },
  skeleton: { padding: 20, gap: 10 },
  skelRow: { height: 16, borderRadius: 8, backgroundColor: C.card2, marginBottom: 6 },

  punchSection: { marginBottom: 16 },
  punchSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  punchDot: { width: 6, height: 6, borderRadius: 99 },
  punchSectionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.8, color: C.ghost },
  punchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card3, borderWidth: 1, borderColor: C.border2,
    borderRadius: 8, padding: 10, marginBottom: 6 },
  punchTime: { fontSize: 15, fontWeight: '500', color: C.text },
  punchMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  punchMetaText: { fontSize: 11, color: C.ghost },
  punchTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  punchTagText: { fontSize: 10 },
  punchRight: { alignItems: 'flex-end', gap: 3 },
  punchScore: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  punchScoreText: { fontSize: 10 },
  punchVerified: { fontSize: 10, color: C.green },
  emptyPunch: { fontSize: 13, color: C.dark, paddingVertical: 8 },

  faceOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 20 },
  faceCard: { backgroundColor: C.card, borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)', padding: 28, alignItems: 'center',
    gap: 12, width: '100%', maxWidth: 360 },
  faceIconCircle: { width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  faceTitle: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3, textAlign: 'center' },
  faceMsgBox: { backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.12)', borderRadius: 10, padding: 12, width: '100%' },
  faceMsgText: { fontSize: 13, color: C.muted, lineHeight: 20, textAlign: 'center' },
  faceHint: { fontSize: 12, color: C.ghost, lineHeight: 18, textAlign: 'center' },
  faceActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  faceRetry: { flex: 2, padding: 13, borderRadius: 12, backgroundColor: '#3b5bdb', alignItems: 'center' },
  faceRetryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  faceDismiss: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  faceDismissText: { fontSize: 14, fontWeight: '500', color: C.muted },
});
