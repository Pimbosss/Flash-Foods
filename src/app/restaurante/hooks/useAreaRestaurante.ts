'use client';

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";

export interface DadosLoja {
    id: string;
    nome: string;
    endereco: string;
    categoria?: string;
    cnpj?: string;
    usuarioId: string;
    produtos: any[];
}

export default function useAreaRestaurante() {
    const [abaAtiva, setAbaAtiva] = useState<"visao-geral" | "produtos" | "pedidos" | "perfil">("visao-geral");
    const [dados, setDados] = useState<DadosLoja>({ id: "", nome: "", endereco: "", usuarioId: "", produtos: [] });
    const [pedidos, setPedidos] = useState([]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const sessao = localStorage.getItem("flashfoods:user");

            if (!sessao) {
                alert("Acesso negado! Faça login para gerenciar o restaurante. 🔐");
                window.location.href = "/login";
                return;
            }

            const usuarioLogado = JSON.parse(sessao);
            if (usuarioLogado.tipo !== "restaurante") {
                alert("⚠️ Acesso Negado! Esta área é exclusiva para estabelecimentos parceiros.");
                window.location.href = "/";
                return;
            }

            // 🔍 Busca a loja no Firestore onde usuarioId == usuarioLogado.id
            async function carregarLoja() {
                try {
                    const q = query(
                        collection(db, "restaurantes"),
                        where("usuarioId", "==", usuarioLogado.id)
                    );
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const docLoja = querySnapshot.docs[0];
                        const lojaDoBanco = docLoja.data();

                        setDados({
                            id: docLoja.id,
                            nome: lojaDoBanco.nome || "",
                            endereco: lojaDoBanco.endereco || "",
                            categoria: lojaDoBanco.categoria || "",
                            cnpj: lojaDoBanco.cnpj || "",
                            usuarioId: lojaDoBanco.usuarioId || "",
                            produtos: lojaDoBanco.produtos || []
                        });
                        const qPedidos = query(
                            collection(db, "pedidos"),
                            where("restauranteId", "==", docLoja.id)
                        );
                        const snapPedidos = await getDocs(qPedidos);
                        const listaPedidosLoja = snapPedidos.docs.map(d => ({
                            id: d.id,
                            ...d.data()
                        }));
                        setPedidos(listaPedidosLoja as any);
                    }
                } catch (err) {
                    console.error("Erro ao sincronizar dados comerciais no Firestore:", err);
                }
            }

            carregarLoja();
        }
    }, []);

    return {
        abaAtiva,
        setAbaAtiva,
        dados,
        pedidos
    };
}
