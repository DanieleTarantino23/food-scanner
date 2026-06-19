import { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors } from '../../src/constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) { setError('Fill in all fields.'); return; }
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) { setError(authError.message); return; }
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🥦</Text>
        <Text style={styles.title}>FoodScanner</Text>
        <Text style={styles.subtitle}>Know what you eat.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color={Colors.bg} />
              : <Text style={styles.btnText}>Sign in</Text>
            }
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.link}>No account yet? <Text style={styles.linkAccent}>Sign up</Text></Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 8,
  },
  logo:     { fontSize: 56, marginBottom: 8 },
  title:    { color: Colors.textPrimary, fontSize: 28, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: 15, marginBottom: 24 },
  form:     { width: '100%', gap: 12 },
  input: {
    backgroundColor:  Colors.bgInput,
    borderRadius:     14,
    paddingVertical:  14,
    paddingHorizontal: 16,
    color:            Colors.textPrimary,
    fontSize:         16,
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  error: { color: Colors.error, fontSize: 13, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.info,
    borderRadius:    14,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:       { color: Colors.textTertiary, fontSize: 14, textAlign: 'center', marginTop: 8 },
  linkAccent: { color: Colors.info, fontWeight: '600' },
});
