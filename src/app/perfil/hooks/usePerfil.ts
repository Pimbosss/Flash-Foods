'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import Usuario from '@/core/Usuarios';

export default function usePerfil() {
    const router = useRouter();
    const [userData, setUserData] = useState<Usuario | null>(null);

    const updatedField = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        if (userData) {
            setUserData({ ...userData, [name]: value });
        }
    };

    // 🔒 Trava de segurança e busca dos dados reais no Firestore
    useEffect(() => {
        const session = localStorage.getItem("flashfoods:user");

        if (!session) {
            alert('Acesso negado! Faça login para acessar o perfil. 🔐');
            router.push('/login');
            return;
        }

        const loggedUser = JSON.parse(session);

        async function carregarPerfil() {
            try {
                const userRef = doc(db, "users", loggedUser.id);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setUserData(userSnap.data() as Usuario);
                } else {
                    setUserData(loggedUser);
                }
            } catch (error) {
                console.error("Erro ao carregar perfil do Firestore:", error);
            }
        }

        carregarPerfil();
    }, [router]);

    // 💾 Atualiza os dados editáveis (Nome, Telefone e CPF) diretamente no Firestore
    const save = async () => {
        if (!userData || !userData.id) return;

        try {
            const userRef = doc(db, "users", userData.id);
            await updateDoc(userRef, {
                name: userData.name,
                phone: userData.phone || "",
                cpf: userData.cpf || "",
                endereco: userData.endereco || ""
            });

            // Atualiza a sessão ativa do cabeçalho
            const session = localStorage.getItem('flashfoods:user');
            if (session) {
                const loggedUser = JSON.parse(session);
                const novaSessao = {
                    ...loggedUser,
                    name: userData.name
                };
                localStorage.setItem('flashfoods:user', JSON.stringify(novaSessao));
            }

            window.dispatchEvent(new Event("perfilAtualizado"));
            alert('Dados do perfil salvos com sucesso na nuvem! ✨');
        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
            alert('Erro ao salvar alterações do perfil.');
        }
    };


    return {
        userData,
        router,
        updatedField,
        save
    };
}
