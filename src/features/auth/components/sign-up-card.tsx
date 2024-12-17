"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, TriangleAlert } from "lucide-react";

import { useSignUp } from "@/features/auth/hooks/use-sign-up";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card";

export const SignUpCard = () => {
  const [loading, setLoading] = useState(false);

  const mutation = useSignUp();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const onCredentialSignUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    mutation.mutate(
        {
          username:name,
          password,
        },
        {
          onSuccess: () => {
            signIn("credentials", {
              username:name,
              password,
              callbackUrl: "/",
            });
          },
        }
    );
  };

  return (
      <Card className="w-full h-full p-8">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Use your username and password to continue</CardDescription>
        </CardHeader>
        {!!mutation.error && (
            <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
              <TriangleAlert className="size-4" />
              <p>Something went wrong</p>
            </div>
        )}
        <CardContent className="space-y-5 px-0 pb-0">
          <form onSubmit={onCredentialSignUp} className="space-y-2.5">
            <Input
                disabled={mutation.isPending || loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Username"
                type="text"
                required
            />
            <Input
                disabled={mutation.isPending || loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                required
                minLength={3}
                maxLength={20}
            />
            <Button
                className="w-full"
                type="submit"
                size="lg"
                disabled={loading || mutation.isPending}
            >
              {mutation.isPending ? (
                  <Loader2 className="mr-2 size-5 top-2.5 left-2.5 animate-spin" />
              ) : (
                  "Continue"
              )}
            </Button>
          </form>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" onClick={() => setLoading(true)}>
              <span className="text-sky-700 hover:underline">Sign in</span>
            </Link>
          </p>
        </CardContent>
      </Card>
  );
};
