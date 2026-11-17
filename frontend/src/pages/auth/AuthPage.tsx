import { Alert, Button, Container, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { type FormEvent, useState } from "react";
import { type AuthUser, authService } from "../../services/authService";
import { authStrings } from "./strings";

interface Props {
  onAuthenticated: (user: AuthUser) => void;
}

export function AuthPage({ onAuthenticated }: Props) {
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    try {
      const result = registering
        ? await authService.register({
            email,
            password,
            firstName: String(data.get("firstName") ?? ""),
            lastName: String(data.get("lastName") ?? ""),
          })
        : await authService.login(email, password);
      onAuthenticated(result.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : authStrings.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container size={420} my="15vh">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <form onSubmit={submit}>
          <Stack>
            <Title order={2}>{authStrings.title}</Title>
            <Text c="dimmed" size="sm">
              {authStrings.subtitle}
            </Text>
            {error && <Alert color="red">{error}</Alert>}
            {registering && (
              <>
                <TextInput name="firstName" label={authStrings.firstName} required maxLength={80} />
                <TextInput name="lastName" label={authStrings.lastName} required maxLength={80} />
              </>
            )}
            <TextInput
              name="email"
              type="email"
              label={authStrings.email}
              required
              maxLength={254}
              autoComplete="email"
            />
            <PasswordInput
              name="password"
              label={authStrings.password}
              required
              minLength={8}
              maxLength={128}
              autoComplete={registering ? "new-password" : "current-password"}
            />
            <Button type="submit" loading={busy}>
              {registering ? authStrings.register : authStrings.login}
            </Button>
            <Text size="sm" ta="center">
              {registering ? authStrings.hasAccount : authStrings.noAccount}{" "}
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={() => {
                  setRegistering(!registering);
                  setError("");
                }}
              >
                {registering ? authStrings.switchToLogin : authStrings.switchToRegister}
              </Button>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
