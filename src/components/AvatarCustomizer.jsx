import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import NeonCard from './NeonCard';
import AvatarDisplay from './AvatarDisplay';
import { toast } from 'sonner';

export default function AvatarCustomizer({ user }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.User.update(user.id, {
        avatar_image_url: file_url,
        use_custom_avatar: true
      });

      queryClient.invalidateQueries(['currentUserProfile']);
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const removeCustomAvatar = async () => {
    await base44.entities.User.update(user.id, {
      use_custom_avatar: false
    });
    queryClient.invalidateQueries(['currentUserProfile']);
    toast.success('Foto de perfil removida');
  };

  return (
    <NeonCard glowColor="cyan">
      <div className="space-y-6">
        {/* Preview */}
        <div className="text-center">
          <h3 className="text-white font-bold text-lg mb-4">Foto de Perfil</h3>
          <div className="flex justify-center mb-4">
            <AvatarDisplay user={user} size="xl" showEquipment />
          </div>
        </div>

        {/* Upload */}
        <div className="space-y-3">
          <label 
            htmlFor="avatar-upload"
            className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-cyan-500/50 rounded-xl cursor-pointer hover:border-cyan-500 hover:bg-cyan-500/10 transition-all"
          >
            <Upload className="w-6 h-6 text-cyan-400" />
            <span className="text-white font-semibold">
              {uploading ? 'Fazendo upload...' : 'Escolher Foto de Perfil'}
            </span>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
          />
          <p className="text-gray-400 text-xs text-center">
            Recomendado: imagem quadrada, mínimo 200x200px
          </p>
        </div>

        {user?.use_custom_avatar && user?.avatar_image_url && (
          <Button
            onClick={removeCustomAvatar}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4 mr-2" />
            Remover Foto de Perfil
          </Button>
        )}
      </div>
    </NeonCard>
  );
}