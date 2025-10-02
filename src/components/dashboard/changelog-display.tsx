
'use client';

import { changelog } from "@/lib/changelog"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function ChangelogDisplay() {
    return (
        <div className="space-y-4">
            <div className="text-center">
                <h2 className="text-2xl font-bold font-headline">Changelog MannaTic</h2>
                <p className="text-muted-foreground">Le ultime novità e miglioramenti dell'applicazione.</p>
            </div>
            <div className="space-y-8">
            {changelog.map((entry, index) => (
                <div key={index} className="flex items-start gap-4 md:gap-8">
                    <div className="flex flex-col items-center">
                        <div className={`rounded-full p-2 bg-muted ${entry.iconClass}`}>
                            <entry.icon className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{entry.date}</p>
                    </div>
                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle>
                                <Badge variant="outline" className="mr-2">v{entry.version}</Badge>
                                {entry.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {entry.changes.map((change, cIndex) => (
                                    <li key={cIndex} className="flex items-start gap-3 text-sm">
                                        <change.type className="h-4 w-4 mt-0.5 text-primary shrink-0"/>
                                        <span className="text-muted-foreground">{change.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            ))}
            </div>
        </div>
    )
}
