import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, s } from '@/src/components/UI';
import { authApi } from '@/src/api/all';
import { useAuth } from '@/src/state/Auth';
import { errMsg } from '@/src/lib/format';

const DEV_LOGIN_ENABLED = process.env.EXPO_PUBLIC_DEV_LOGIN === 'true';
const DEV_OTP = '1234';

export default function Login() {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function request() {
    if (mobile.replace(/\D/g, '').length < 10) {
      return Alert.alert('Invalid mobile', 'Enter a valid mobile number');
    }
    setBusy(true);
    try {
      await authApi.requestOtp(mobile.trim());
      setSent(true);
      Alert.alert('OTP requested', 'Enter the OTP sent to your mobile.');
    } catch (e) {
      Alert.alert('Unable to request OTP', errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function devLogin() {
    if (mobile.replace(/\D/g, '').length < 10) {
      return Alert.alert('Invalid mobile', 'Enter a valid mobile number');
    }
    setBusy(true);
    try {
      await login(mobile.trim(), DEV_OTP);
      router.replace('/');
    } catch (e) {
      Alert.alert(
        'Development login failed',
        `${errMsg(e)}\n\nMake sure this mobile number belongs to an existing test user.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (otp.length < 4) {
      return Alert.alert('OTP required', 'Enter the OTP');
    }
    setBusy(true);
    try {
      await login(mobile.trim(), otp.trim());
      router.replace('/');
    } catch (e) {
      Alert.alert('Login failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.screen}
    >
      <View style={{ marginTop: 80 }}>
        <Text style={s.title}>Chit Management</Text>
        <Text style={[s.subtitle, { fontSize: 16, marginBottom: 28 }]}>
          Secure monthly chit management
        </Text>

        {DEV_LOGIN_ENABLED && (
          <View style={{ marginBottom: 20, padding: 12, borderRadius: 8, borderWidth: 1 }}>
            <Text style={{ fontWeight: '700', marginBottom: 4 }}>
              DEVELOPMENT MODE
            </Text>
            <Text>
              Use an existing test user's mobile number to login without requesting an SMS OTP.
            </Text>
          </View>
        )}

        <Input
          label="Mobile number"
          value={mobile}
          onChangeText={setMobile}
          placeholder="+919999999999"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />

        <Button title="Request OTP" onPress={request} disabled={busy} />

        {DEV_LOGIN_ENABLED && (
          <View style={{ marginTop: 12 }}>
            <Button title="Development Login" onPress={devLogin} disabled={busy} />
            <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>
              Development OTP: 1234
            </Text>
          </View>
        )}

        {sent && (
          <>
            <Input
              label="OTP"
              value={otp}
              onChangeText={setOtp}
              placeholder="1234"
              keyboardType="number-pad"
              maxLength={8}
            />
            <Button title="Verify & Login" onPress={verify} disabled={busy} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
