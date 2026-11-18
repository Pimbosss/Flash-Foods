'use client';

import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useCarrinho } from "@/context/CarrinhoContext";

export default function useCarrinhoPage() {
    const router = useRouter();
    
    const {
        carrinho,
        aumentarQuantidade,
        diminuirQuantidade,
        removerDoCarrinho,
        valorTotal
    } = useCarrinho();

    // 🔑 ENVIAR PEDIDO PARA O FIRESTORE
    async function lidarComFinalizarPedido() {
        const sessao = localStorage.getItem("flashfoods:user");
        
        if (!sessao) {
            alert("Para finalizar o pedido, por favor faça login ou cadastre-se antes! 🔐");
            router.push("/login");
            return;
        }

        const usuarioLogado = JSON.parse(sessao);
        const primeiroItem = carrinho[0]; 

        const novoPedido = {
            usuarioId: usuarioLogado.id,
            usuarioNome: usuarioLogado.name,
            itens: carrinho, 
            subtotal: valorTotal,
            taxaEntrega: 5.00,
            total: valorTotal + 5.00,
            status: "pendente", 
            data: new Date().toLocaleString("pt-BR"),
            endereco: usuarioLogado.endereco || "Endereço não informado no perfil", 
            restauranteId: primeiroItem?.restauranteId || "rest_default",
            restaurante: primeiroItem?.nomeRestaurante || primeiroItem?.restaurante || "Restaurante Parceiro"
        };

        try {
            await addDoc(collection(db, "pedidos"), novoPedido);
            alert("Pedido finalizado com sucesso na nuvem! 🍔🔥 Seu lanche começou a ser preparado.");
            
            carrinho.forEach(item => removerDoCarrinho(item.id));
            
            router.push("/");
        } catch (error) {
            console.error("Erro ao enviar pedido para o Firestore:", error);
            alert("Ocorreu um erro ao conectar com o servidor. Tente novamente.");
        }
    }

    return {
        router,
        carrinho,
        valorTotal,
        aumentarQuantidade,
        diminuirQuantidade,
        removerDoCarrinho,
        lidarComFinalizarPedido
    };
}
