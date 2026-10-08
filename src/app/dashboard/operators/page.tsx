'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-context';
import { Header } from '@/components/dashboard/header';
import { User as UserType } from '@/lib/types';
import {
  getOperatorsByDistributorId,
  addUser,
  updateUser,
  deleteUser,
} from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader, Plus, Pencil, Trash2, Shield, ShieldCheck, ShieldAlert, Mail, User as UserIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ROLE_LABELS: Record<string, string> = {
  DistributorAdmin: 'Admin',
  DistributorUser: 'Utente',
};

const ROLE_COLORS: Record<string, string> = {
  DistributorAdmin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DistributorUser: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface OperatorForm {
  name: string;
  email: string;
  password: string;
  role: 'DistributorAdmin' | 'DistributorUser';
}

const defaultForm = (): OperatorForm => ({
  name: '',
  email: '',
  password: '',
  role: 'DistributorUser',
});

export default function OperatorsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [operators, setOperators] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<UserType | null>(null);
  const [form, setForm] = useState<OperatorForm>(defaultForm());
  const [isSaving, setIsSaving] = useState(false);

  const isDistributor = user?.role === 'Distributor';
  const isDistributorAdmin = user?.role === 'DistributorAdmin';
  const canManage = isDistributor; // Only the main distributor can add/edit/delete operators

  useEffect(() => {
    if (!user) return;
    const distributorId = isDistributor ? user.id : user.distributorId;
    if (!distributorId) { setIsLoading(false); return; }
    getOperatorsByDistributorId(distributorId).then(ops => {
      setOperators(ops);
      setIsLoading(false);
    });
  }, [user]);

  const openCreate = () => {
    setEditingOp(null);
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const openEdit = (op: UserType) => {
    setEditingOp(op);
    setForm({ name: op.name, email: op.email, password: '', role: op.role as any });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.name || !form.email) return;
    setIsSaving(true);
    try {
      const distributorId = user.id;
      if (editingOp) {
        // Update existing operator
        const updated = await updateUser(editingOp.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        if (updated) {
          setOperators(prev => prev.map(o => o.id === editingOp.id ? { ...o, ...updated } : o));
          toast({ title: 'Operatore aggiornato' });
          setDialogOpen(false);
        }
      } else {
        // Create new operator
        const newOp = await addUser({
          name: form.name,
          email: form.email,
          password: form.password || 'operatore123',
          role: form.role,
          companyId: user.companyId,
          distributorId,
        });
        setOperators(prev => [...prev, newOp]);
        toast({ title: 'Operatore creato', description: `Password temporanea: ${form.password || 'operatore123'}` });
        setDialogOpen(false);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Errore', description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (op: UserType) => {
    try {
      await deleteUser(op.id);
      setOperators(prev => prev.filter(o => o.id !== op.id));
      toast({ title: 'Operatore eliminato' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Errore', description: err?.message });
    }
  };

  if (!user || (!isDistributor && !isDistributorAdmin)) {
    return (
      <>
        <Header title="Operatori" />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Accesso non autorizzato.</div>
      </>
    );
  }

  return (
    <>
      <Header title="Operatori" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Gestione Operatori</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Crea e gestisci gli operatori del tuo team.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo operatore
            </Button>
          )}
        </div>

        {/* Role legend */}
        <div className="flex flex-wrap gap-4 rounded-xl border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Admin</span>
            <span className="text-muted-foreground">— accesso completo: supporto, preventivi, gestione operatori e statistiche</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-gray-400" />
            <span className="font-medium">Utente</span>
            <span className="text-muted-foreground">— accesso limitato: solo supporto e preventivi</span>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader className="h-8 w-8 animate-spin" /></div>
        ) : operators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-3">
            <UserIcon className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">Nessun operatore</p>
            {canManage && <p className="text-sm">Crea il primo operatore usando il pulsante in alto a destra.</p>}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operators.map(op => (
              <div key={op.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      op.role === 'DistributorAdmin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {op.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{op.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" />{op.email}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(op)} title="Modifica">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Elimina">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Elimina operatore</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare &quot;{op.name}&quot;? L&apos;azione non è reversibile.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(op)} className="bg-destructive hover:bg-destructive/90">
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[op.role] ?? ''}`}>
                  {ROLE_LABELS[op.role] ?? op.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingOp(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOp ? 'Modifica operatore' : 'Nuovo operatore'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="op-name">Nome *</Label>
              <Input id="op-name" placeholder="Mario Rossi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op-email">Email *</Label>
              <Input id="op-email" type="email" placeholder="mario@installatore.it" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editingOp} />
              {editingOp && <p className="text-xs text-muted-foreground">L&apos;email non può essere modificata.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op-password">{editingOp ? 'Nuova password (lascia vuoto per non cambiare)' : 'Password *'}</Label>
              <Input id="op-password" type="password" placeholder={editingOp ? 'Lascia vuoto per non modificare' : 'Minimo 6 caratteri'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op-role">Ruolo *</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as any }))}>
                <SelectTrigger id="op-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DistributorAdmin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      Admin — accesso completo
                    </div>
                  </SelectItem>
                  <SelectItem value="DistributorUser">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      Utente — solo supporto e preventivi
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSaving}>Annulla</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving || !form.name || !form.email || (!editingOp && !form.password)}>
              {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvataggio...' : editingOp ? 'Salva modifiche' : 'Crea operatore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
