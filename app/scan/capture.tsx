import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../src/constants/colors';
import { scanProductWithAI } from '../../src/api/vercelProxy';
import { scoreProduct } from '../../src/lib/scoring';

type CaptureStep = 'front' | 'ingredients' | 'nutrition';

const STEPS: CaptureStep[] = ['front', 'ingredients', 'nutrition'];

const STEP_LABELS: Record<CaptureStep, { title: string; hint: string }> = {
  front:       { title: 'Front label',        hint: 'Frame the product name and brand' },
  ingredients: { title: 'Ingredients list',   hint: 'Capture the full ingredients text' },
  nutrition:   { title: 'Nutrition table',     hint: 'Frame the entire nutrition facts panel' },
};

export default function CaptureScreen() {
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();
  const router      = useRouter();
  const cameraRef   = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [processing, setProcessing]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const step = STEPS[currentStep];

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || processing) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
    if (!photo) return;

    // Resize to 1024px max to keep payload small for the AI
    const compressed = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    const b64 = compressed.base64;
    if (!b64) return;

    const newImages = [...capturedImages, b64];
    setCapturedImages(newImages);

    if (currentStep < STEPS.length - 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStep((s) => s + 1);
      return;
    }

    // All 3 photos captured → send to Vercel AI proxy
    setProcessing(true);
    setError(null);

    try {
      const result = await scanProductWithAI({
        images:  newImages as [string, string, string],
        barcode: barcode ?? undefined,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate to product detail with AI-supplied data
      // In production: upsert result.product to Supabase first, then push
      router.replace(`/product/${result.product.code ?? barcode ?? 'unknown'}`);
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('AI scan failed. Please try again.');
      setCapturedImages([]);
      setCurrentStep(0);
    } finally {
      setProcessing(false);
    }
  }, [cameraRef, capturedImages, currentStep, processing, barcode, router]);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is required.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      {/* Step progress pills */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.pill,
              i < currentStep  && styles.pillDone,
              i === currentStep && styles.pillActive,
            ]}
          />
        ))}
      </View>

      {/* Instruction overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.stepTitle}>{STEP_LABELS[step].title}</Text>
        <Text style={styles.stepHint}>{STEP_LABELS[step].hint}</Text>
      </View>

      {/* Capture button */}
      <View style={styles.footer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Pressable
          style={[styles.shutter, processing && styles.shutterDisabled]}
          onPress={capturePhoto}
          disabled={processing}
        >
          {processing
            ? <ActivityIndicator color={Colors.bg} />
            : <View style={styles.shutterInner} />
          }
        </Pressable>
        <Text style={styles.photoCount}>
          {currentStep + 1} / {STEPS.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  camera:         { flex: 1 },
  center:         { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  permText:       { color: Colors.textSecondary, fontSize: 15 },

  stepRow: {
    position:       'absolute',
    top:             56,
    left:            0,
    right:           0,
    flexDirection:   'row',
    justifyContent:  'center',
    gap:             8,
  },
  pill:        { width: 32, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  pillDone:    { backgroundColor: Colors.success },
  pillActive:  { backgroundColor: Colors.info },

  infoOverlay: {
    position:       'absolute',
    bottom:          160,
    left:            24,
    right:           24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius:    16,
    padding:         16,
    gap:             4,
    alignItems:      'center',
  },
  stepTitle:   { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  stepHint:    { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },

  footer: {
    position:       'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    alignItems:      'center',
    paddingBottom:   48,
    gap:             12,
  },
  shutter: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: Colors.textPrimary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     4,
    borderColor:     Colors.bgCard,
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width:        52,
    height:       52,
    borderRadius: 26,
    backgroundColor: Colors.textPrimary,
  },
  photoCount:    { color: Colors.textTertiary, fontSize: 13 },
  errorText:     { color: Colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },

  btn:     { backgroundColor: Colors.info, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  btnText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
});
