import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name, email, and message.",
        variant: "destructive",
      });
      return;
    }

    if (message.trim().length < 10) {
      toast({
        title: "Message Too Short",
        description: "Please write at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const fullMessage = subject.trim()
        ? `Subject: ${subject.trim()}\n\n${message.trim()}`
        : message.trim();

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: fullMessage }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      toast({
        title: "Send Failed",
        description: "We couldn't send your message. Please try again or email us directly at support@spellingplayground.com.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Contact Us</h1>
            <p className="text-sm text-muted-foreground">Spelling Playground LLC</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5" />
              Get in Touch
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="py-8 text-center space-y-4" data-testid="status-message-sent">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <div>
                  <p className="font-semibold text-lg">Message Sent!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Thank you for reaching out. We'll get back to you as soon as possible.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSent(false)}
                  data-testid="button-send-another"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Your Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="input-contact-name"
                      disabled={sending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email Address</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-contact-email"
                      disabled={sending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-subject">
                    Subject <Badge variant="secondary" className="ml-1 text-xs">Optional</Badge>
                  </Label>
                  <Input
                    id="contact-subject"
                    placeholder="What's this about?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    data-testid="input-contact-subject"
                    disabled={sending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Share your question, feedback, privacy request, or anything else..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[140px]"
                    data-testid="input-contact-message"
                    disabled={sending}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={sending}
                  data-testid="button-submit-contact"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can also reach us directly by email at{" "}
              <a
                href="mailto:support@spellingplayground.com"
                className="text-primary underline underline-offset-2"
              >
                support@spellingplayground.com
              </a>
              .
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Spelling Playground LLC<br />
              650 Jersey Ave., Jersey City, NJ 07302
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
