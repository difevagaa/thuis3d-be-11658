import { CheckCircle2, XCircle, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ResponseEntry {
  timestamp: string;
  type: 'approve' | 'reject' | 'comment';
  message?: string;
}

interface QuoteResponseTimelineProps {
  customText?: string;
  className?: string;
}

export function QuoteResponseTimeline({ customText, className = "" }: QuoteResponseTimelineProps) {
  if (!customText) return null;

  // Parse the custom_text field into structured response entries
  const parseResponses = (text: string): ResponseEntry[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const entries: ResponseEntry[] = [];

    for (const line of lines) {
      // Format: "DD/MM/YYYY, HH:MM:SS - Action: message"
      const match = line.match(/^(.+?)\s*-\s*(.+?)(?::\s*(.+))?$/);
      if (match) {
        const [, timestamp, actionText, message] = match;
        
        let type: 'approve' | 'reject' | 'comment' = 'comment';
        if (actionText.includes('Aprobación')) {
          type = 'approve';
        } else if (actionText.includes('Rechazo')) {
          type = 'reject';
        }

        entries.push({
          timestamp: timestamp.trim(),
          type,
          message: message?.trim()
        });
      }
    }

    return entries;
  };

  const responses = parseResponses(customText);

  if (responses.length === 0) return null;

  return (
    <div className={className}>
      <div className="space-y-3">
        {responses.map((response, index) => {
          const isApproval = response.type === 'approve';
          const isRejection = response.type === 'reject';
          const isComment = response.type === 'comment';

          return (
            <Card
              key={index}
              className={`border-l-4 ${
                isApproval
                  ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
                  : isRejection
                  ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${
                    isApproval ? 'text-green-600' : isRejection ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {isApproval && <CheckCircle2 className="h-5 w-5" />}
                    {isRejection && <XCircle className="h-5 w-5" />}
                    {isComment && <MessageSquare className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={isApproval ? 'default' : isRejection ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {isApproval && '✅ Aprobado'}
                        {isRejection && '❌ Rechazado'}
                        {isComment && '💬 Comentario'}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{response.timestamp}</span>
                      </div>
                    </div>

                    {response.message && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-sm text-foreground leading-relaxed">
                          {response.message}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
