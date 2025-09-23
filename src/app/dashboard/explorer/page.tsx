
'use client';

import { Header } from '@/components/dashboard/header';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Loader } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCompanies, getAllUsers, getAllInterventions, getAllSurveys, getAllNotifications } from '@/lib/data';
import { Company, User, Intervention, ScheduledMaintenance, Survey, Notification } from '@/lib/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type Data = {
    companies: Company[];
    users: User[];
    interventions: (Intervention | ScheduledMaintenance)[];
    surveys: Survey[];
    notifications: Notification[];
}

const JsonCell = ({ data }: { data: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (data === null || data === undefined) {
    return <pre className="text-xs text-muted-foreground">null</pre>;
  }

  const jsonString = JSON.stringify(data, null, 2);
  const isExpandable = jsonString.length > 50;

  return (
    <div className="text-xs" onClick={() => isExpandable && setIsExpanded(!isExpanded)}>
        <pre className={`whitespace-pre-wrap break-all ${isExpandable && !isExpanded ? 'truncate' : ''} ${isExpandable ? 'cursor-pointer' : ''}`}>
            {jsonString}
        </pre>
    </div>
  )
}

function DataTable({ data }: { data: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(item => 
            JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    if (!data || data.length === 0) {
        return <p className="text-muted-foreground">No data available.</p>;
    }

    const headers = Object.keys(data[0] || {});

    return (
        <div className="space-y-4">
            <Input 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            <Card>
                <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {headers.map(header => (
                                    <TableCell key={header}>
                                        <JsonCell data={row[header]} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </Card>
        </div>
    )
}


export default function ExplorerPage() {
    const { user } = useUser();
    const router = useRouter();
    const [data, setData] = useState<Data | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if(user && user.role !== 'Creator') {
            router.push('/dashboard');
            return;
        }

        async function fetchData() {
            setIsLoading(true);
            const [companies, users, interventions, surveys, notifications] = await Promise.all([
                getCompanies(),
                getAllUsers(),
                getAllInterventions(),
                getAllSurveys(),
                getAllNotifications()
            ]);
            setData({ companies, users, interventions, surveys, notifications });
            setIsLoading(false);
        }

        if (user) {
            fetchData();
        }

    }, [user, router]);


    if (isLoading || !user || !data) {
        return (
            <>
                <Header title="Data Explorer" />
                <div className="flex items-center justify-center flex-1">
                    <Loader className="h-8 w-8 animate-spin" />
                </div>
            </>
        )
    }

    if (user.role !== 'Creator') {
        return null;
    }


    return (
        <>
            <Header title="Data Explorer" />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <Tabs defaultValue="companies">
                    <TabsList>
                        <TabsTrigger value="companies">Companies</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="interventions">Interventions</TabsTrigger>
                        <TabsTrigger value="surveys">Surveys</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    </TabsList>
                    <TabsContent value="companies" className="pt-4">
                        <DataTable data={data.companies} />
                    </TabsContent>
                     <TabsContent value="users" className="pt-4">
                        <DataTable data={data.users} />
                    </TabsContent>
                     <TabsContent value="interventions" className="pt-4">
                        <DataTable data={data.interventions} />
                    </TabsContent>
                    <TabsContent value="surveys" className="pt-4">
                        <DataTable data={data.surveys} />
                    </TabsContent>
                     <TabsContent value="notifications" className="pt-4">
                        <DataTable data={data.notifications} />
                    </TabsContent>
                </Tabs>
            </main>
        </>
    );
}
