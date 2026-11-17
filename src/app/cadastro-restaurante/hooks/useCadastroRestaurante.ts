'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, addDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import Usuario from "@/core/Usuarios";

export interface CadastroRestauranteForm extends Usuario {
    nomeRestaurante: string;
    cnpj: string;
    categoria: string;
}

const formInitialState: CadastroRestauranteForm = {
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    confirmPassword: "",
    tipo: "restaurante",
    nomeRestaurante: "",
    cnpj: "",
    categoria: "Pizza"
};

export default function useCadastroRestaurante() {
    const router = useRouter();
    const [restaurante, setRestaurante] = useState<CadastroRestauranteForm>({ ...formInitialState });

    const updatedField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setRestaurante(prev => ({ ...prev, [name]: value }));
    };

    const save = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!restaurante.email || !restaurante.name || !restaurante.password || !restaurante.cnpj || !restaurante.nomeRestaurante) {
            alert("Por favor, preencha todos os campos obrigatórios! 📝");
            return;
        }

        if (restaurante.password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres! 🔐");
            return;
        }

        if (restaurante.password !== restaurante.confirmPassword) {
            alert("As senhas não coincidem! ❌");
            return;
        }

        try {
            const emailLimpo = restaurante.email.toLowerCase().trim();

            // 1. Cria a conta no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, restaurante.password);
            const uid = userCredential.user.uid;

            // 2. Cria a loja na coleção "restaurantes" do Firestore
            const lojaRef = await addDoc(collection(db, "restaurantes"), {
                nome: restaurante.nomeRestaurante,
                cnpj: restaurante.cnpj,
                categoria: restaurante.categoria,
                endereco: "Endereço não informado",
                usuarioId: uid,
                produtos: []
            });

            // 3. Salva o perfil do proprietário na coleção "users" amarrado ao ID da loja
            await setDoc(doc(db, "users", uid), {
                id: uid,
                name: restaurante.name,
                email: emailLimpo,
                phone: restaurante.phone,
                cpf: restaurante.cpf,
                tipo: "restaurante",
                restauranteId: lojaRef.id
            });

            // Atualiza a loja incluindo o próprio ID dentro do documento para facilitar buscas futuras
            await updateDoc(doc(db, "restaurantes", lojaRef.id), {
                id: lojaRef.id
            });

            alert("Restaurante cadastrado com sucesso na nuvem! 🏪✨");
            setRestaurante({ ...formInitialState });
            router.push("/login");

        } catch (error: any) {
            console.error("Erro ao cadastrar restaurante:", error);
            if (error.code === "auth/email-already-in-use") {
                alert("Este e-mail comercial já está cadastrado no Flash Foods! ⚠️");
            } else {
                alert("Erro de comunicação com o Firebase ao tentar cadastrar.");
            }
        }
    };

    return {
        restaurante,
        router,
        updatedField,
        save
    };
}
