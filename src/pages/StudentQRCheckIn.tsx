import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function StudentQRCheckIn() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No check-in token provided.');
            return;
        }

        let mounted = true;
        api.attendance.checkInSession({ token })
            .then(() => {
                if (!mounted) return;
                setStatus('success');
                setMessage('Successfully checked in!');
            })
            .catch((error: any) => {
                if (!mounted) return;
                setStatus('error');
                setMessage(error.message || 'Failed to check in. The session might be invalid or expired.');
            });

        return () => {
            mounted = false;
        };
    }, [token]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <Card className="border-slate-100 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                            {status === 'loading' && <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />}
                            {status === 'success' && <CheckCircle2 className="w-16 h-16 text-emerald-500" />}
                            {status === 'error' && <XCircle className="w-16 h-16 text-red-500" />}
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {status === 'loading' && 'Checking in...'}
                            {status === 'success' && 'Check-in Successful'}
                            {status === 'error' && 'Check-in Failed'}
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            {status === 'loading' && 'Please wait while we verify your session.'}
                            {status !== 'loading' && message}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 mt-6">
                        <Button 
                            className="w-full h-12 text-lg rounded-xl"
                            onClick={() => navigate('/dashboard')}
                            variant={status === 'success' ? 'default' : 'outline'}
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
